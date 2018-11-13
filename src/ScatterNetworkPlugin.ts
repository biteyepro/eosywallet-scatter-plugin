import { BaseNetworkPlugin, EosyAccount, IEosyNetworkOption } from '@biteye/eosywallet-js'
import { Api, ApiInterfaces } from 'eosjs'
import ScatterJS from 'scatterjs-core'
import ScatterEOS from 'scatterjs-plugin-eosjs'

import { convertLegacyPublicKey } from 'eosjs/dist/eosjs-numeric'

ScatterJS.plugins(new ScatterEOS())

class ScatterSignatureProvider implements ApiInterfaces.SignatureProvider {
  private scatter: any
  private publicKey: string
  private availableKeys: string[] = []
  constructor(scatter: any, pubKey: string) {
      this.scatter = scatter
      this.publicKey = pubKey
      if (pubKey) {
        this.availableKeys = [convertLegacyPublicKey(pubKey)]
      }
  }

  /** Public keys associated with the private keys that the `SignatureProvider` holds */
  public async getAvailableKeys(): Promise<string[]> {
    return this.availableKeys
  }

  /** Sign a transaction */
  public async sign(args: ApiInterfaces.SignatureProviderArgs): Promise<string[]> {
      const signBuf = Buffer.concat([
          new Buffer(args.chainId, 'hex'), new Buffer(args.serializedTransaction), new Buffer(new Uint8Array(32)),
      ])
      if (args.requiredKeys.length !== 1 || this.availableKeys.length !== 1 || this.availableKeys[0] !== convertLegacyPublicKey(args.requiredKeys[0])) {
        throw new Error('Invalid public key!')
      }
      const sign = await this.scatter.getArbitrarySignature(this.publicKey, signBuf, 'Eosy wallet signature request', false)
      return [sign]
  }
}

export class ScatterNetworkPlugin extends BaseNetworkPlugin {
  private scatter: any
  constructor(nwOption: IEosyNetworkOption) {
    super(nwOption)
  }
  public async restore(): Promise<EosyAccount[] | boolean> {
    const scatter = ScatterJS.scatter
    const isConn = await scatter.connect('Eosy Wallet')
    if (!isConn || !scatter.identity || scatter.identity.accounts.length < 1) {
      return false
    }
    return this.prepare(scatter)
  }
  public async login(): Promise<EosyAccount[]> {
    const scatter = ScatterJS.scatter
    const isConn = await scatter.connect('Eosy Wallet')
    if (!isConn) {
      throw new Error('Connect scatter failed')
    }
    const network = {
      blockchain: 'eos',
      host: this.networkOption.host,
      port: this.networkOption.port,
      protocol: this.networkOption.protocol,
      chainId: this.networkOption.chainId,
    }
    const identity = await scatter.getIdentity({
      accounts: [network],
    })
    if (identity.accounts.length < 1) {
      throw new Error('Login failed')
    }
    return this.prepare(scatter)
  }
  public async logout(): Promise<void> {
    if (this.scatter != null) {
      this.scatter.forgetIdentity()
      this.scatter = null
    }
    return new Promise<void>((res) => setTimeout(res, 100))
  }
  private async prepare(scatter: any): Promise<EosyAccount[]> {
    this.scatter = scatter
    (window as any).ScatterJS = null
    const sctAcc = scatter.identity.accounts[0]
    let pubKey: any = sctAcc.publicKey
    if (!pubKey) {
      pubKey = await this.getPublicKey(sctAcc.name, sctAcc.authority)
    }
    this.api = new Api({
      rpc: this.rpc,
      signatureProvider: new ScatterSignatureProvider(scatter, pubKey),
      textEncoder: this.networkOption.textEncoder,
      textDecoder: this.networkOption.textDecoder,
    })
    return [new EosyAccount(sctAcc.name, sctAcc.authority, pubKey)]
  }
  private async getPublicKey(accName: string, auth: string): Promise<string> {
    const accData = await this.rpc.get_account(accName)
    return accData.permissions.find((p: string) => p === auth).required_auth.keys[0].key
  }
}
