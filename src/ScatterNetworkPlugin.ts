import { BaseNetworkPlugin, EosyAccount, IEosyNetworkOption } from '@biteye/eosywallet-js'
import ScatterJS from 'scatterjs-core'
import ScatterEOS from 'scatterjs-plugin-eosjs'

ScatterJS.plugins(new ScatterEOS())

export class ScatterNetworkPlugin extends BaseNetworkPlugin {
  private scatter: any
  constructor(nwOption: IEosyNetworkOption) {
    super(nwOption)
  }
  public async restore(args: any): Promise<EosyAccount[] | boolean> {
    return false
  }
  public async login(args: any): Promise<EosyAccount[]> {
    return []
  }
  public async logout(): Promise<void> {
    if (this.scatter != null) {
      this.scatter.forgetIdentity()
      this.scatter = null
    }
    return new Promise<void>((res, rej) => setTimeout(res, 100))
  }
}
