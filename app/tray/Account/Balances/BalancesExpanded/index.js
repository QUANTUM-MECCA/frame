import React from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'

import link from '../../../../../resources/link'
import svg from '../../../../../resources/svg'
import { isNetworkConnected } from '../../../../../resources/utils/chains'
import Balance from '../Balance'
import {
  formatUsdRate,
  createBalance,
  sortByTotalValue as byTotalValue,
  isNativeCurrency
} from '../../../../../resources/domain/balance'
import { matchFilter } from '../../../../../resources/utils'

import { ClusterBox, Cluster, ClusterRow, ClusterValue } from '../../../../../resources/Components/Cluster'

class BalancesExpanded extends React.Component {
  constructor(...args) {
    super(...args)
    this.moduleRef = React.createRef()

    this.state = {
      openActive: false,
      open: false,
      selected: 0,
      shadowTop: 0,
      expand: false,
      balanceFilter: ''
    }
  }

  getBalances(rawBalances, rates) {
    const { populatedChains } = this.props
    const networks = this.store('main.networks.ethereum')
    const networksMeta = this.store('main.networksMeta.ethereum')

    const balances = rawBalances
      // only show balances from connected networks
      .filter((rawBalance) => isNetworkConnected(networks[rawBalance.chainId]))
      .map((rawBalance) => {
        const isNative = isNativeCurrency(rawBalance.address)
        const nativeCurrencyInfo = networksMeta[rawBalance.chainId].nativeCurrency || {}

        const rate = isNative ? nativeCurrencyInfo : rates[rawBalance.address || rawBalance.symbol] || {}
        const logoURI = (isNative && nativeCurrencyInfo.icon) || rawBalance.logoURI
        const name = isNative ? nativeCurrencyInfo.name || networks[rawBalance.chainId].name : rawBalance.name
        const decimals = isNative ? nativeCurrencyInfo.decimals || 18 : rawBalance.decimals
        const symbol = (isNative && nativeCurrencyInfo.symbol) || rawBalance.symbol

        return createBalance(
          { ...rawBalance, logoURI, name, decimals, symbol },
          networks[rawBalance.chainId].isTestnet ? { price: 0 } : rate.usd
        )
      })
      .filter((balance) => {
        const filter = this.state.balanceFilter
        const chainName = this.store('main.networks.ethereum', balance.chainId, 'name')
        return (
          populatedChains[balance.chainId] &&
          populatedChains[balance.chainId].expires > Date.now() &&
          matchFilter(filter, [chainName, balance.name, balance.symbol])
        )
      })
      .sort(byTotalValue)

    const totalValue = balances.reduce((a, b) => a.plus(b.totalValue), BigNumber(0))

    return { balances, totalDisplayValue: formatUsdRate(totalValue, 0), totalValue }
  }

  renderAccountFilter() {
    return (
      <div className='panelFilterAccount'>
        <div className='panelFilterIcon'>{svg.search(12)}</div>
        <div className='panelFilterInput'>
          <input
            tabIndex='-1'
            type='text'
            spellCheck='false'
            onChange={(e) => {
              const value = e.target.value
              this.setState({ balanceFilter: value })
            }}
            value={this.state.balanceFilter}
          />
        </div>
        {this.state.balanceFilter ? (
          <div
            className='panelFilterClear'
            onClick={() => {
              this.setState({ balanceFilter: '' })
            }}
          >
            {svg.close(12)}
          </div>
        ) : null}
      </div>
    )
  }

  render() {
    const { allChainsUpdated } = this.props
    const { address, lastSignerType } = this.store('main.accounts', this.props.account)
    const storedBalances = this.store('main.balances', address) || []
    const rates = this.store('main.rates')

    const { balances: allBalances, totalDisplayValue, totalValue } = this.getBalances(storedBalances, rates)
    const balances = allBalances.slice(0, this.props.expanded ? allBalances.length : 4)

    const hotSigner = ['ring', 'seed'].includes(lastSignerType)

    return (
      <div className='accountViewScroll'>
        {this.renderAccountFilter()}
        <ClusterBox>
          <Cluster>
            {balances.map(({ chainId, symbol, ...balance }, i) => {
              return (
                <ClusterRow key={chainId + symbol + balance.address}>
                  <ClusterValue>
                    <Balance chainId={chainId} symbol={symbol} balance={balance} i={i} scanning={false} />
                  </ClusterValue>
                </ClusterRow>
              )
            })}
          </Cluster>
        </ClusterBox>
        <div className='signerBalanceTotal' style={{ opacity: allChainsUpdated ? 1 : 0 }}>
          <div className='signerBalanceButtons'>
            <div
              className='signerBalanceButton signerBalanceAddToken'
              onMouseDown={() => {
                link.send('tray:action', 'navDash', { view: 'tokens', data: { notify: 'addToken' } })
              }}
            >
              <span>Add Token</span>
            </div>
          </div>
          <div className='signerBalanceTotalText'>
            <div className='signerBalanceTotalLabel'>{'Total'}</div>
            <div className='signerBalanceTotalValue'>
              {svg.usd(11)}
              {balances.length && allChainsUpdated ? totalDisplayValue : '---.--'}
            </div>
          </div>
        </div>
        {totalValue.toNumber() > 10000 && hotSigner ? (
          <div
            className='signerBalanceWarning'
            onClick={() => this.setState({ showHighHotMessage: !this.state.showHighHotMessage })}
            style={!allChainsUpdated ? { opacity: 0 } : { opacity: 1 }}
          >
            <div className='signerBalanceWarningTitle'>{'high value account is using hot signer'}</div>
            {this.state.showHighHotMessage ? (
              <div className='signerBalanceWarningMessage'>
                {
                  'We recommend using one of our supported hardware signers to increase the security of your account'
                }
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }
}

export default Restore.connect(BalancesExpanded)
