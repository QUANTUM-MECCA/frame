import React from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'

import { GasFeesSource, usesBaseFee } from '../../../../../../../resources/domain/transaction'
import { DisplayValue } from '../../../../../../../resources/domain/transaction/displayValue'
import link from '../../../../../../../resources/link'
import { ClusterBox, Cluster, ClusterRow, ClusterColumn, ClusterValue } from '../../../../../../../resources/Components/Cluster'

const FEE_WARNING_THRESHOLD_USD = 50

const GasDisplay = ({ maxFeePerGas }) => {
  const gweiDisplayValue = maxFeePerGas.toGwei()
  const displayValue = gweiDisplayValue || maxFeePerGas.toWei()
  const displayLabel = !!gweiDisplayValue ? 'Gwei' : 'Wei'

  return (
    <div data-testid='gas-display' className='_txFeeGwei'>
      <span className='_txFeeGweiValue'>{displayValue}</span>
      <span className='_txFeeGweiLabel'>{displayLabel}</span>
    </div>
  )
}     

const USDEstimateDisplay = ({ minFee, maxFee, nativeCurrency, isTestnet }) => {
  const { displayUSD: displayMinFeeUSD } = minFee.toUSD(nativeCurrency, isTestnet)
  const { usd: maxFeeUSD, displayUSD: displayMaxFeeUSD } = maxFee.toUSD(nativeCurrency, isTestnet)
  const displayMaxFeeWarning = maxFeeUSD > FEE_WARNING_THRESHOLD_USD
  
  return <div data-testid='usd-estimate-display' className='clusterTag'>
    <div className={`_txFeeValueDefault${displayMaxFeeWarning ? ' _txFeeValueDefaultWarn' : ''}`}>
      <span>{'≈'}</span>
      {displayMaxFeeUSD === '< 0.01' ? 
      <span>{`$${displayMaxFeeUSD}`}</span> : 
      <>      
        <span>{`$${displayMinFeeUSD}`}</span>
        <span>{'-'}</span>
        <span>{`$${displayMaxFeeUSD}`}</span>
      </>
      }
      <span>{`in ${nativeCurrency.symbol}`}</span>
    </div>
  </div>
}

class TxFee extends React.Component {
  constructor (props, context) {
    super(props, context)
  }

  render () {
    const req = this.props.req
    const chain = { 
      type: 'ethereum', 
      id: parseInt(req.data.chainId, 16)
    }
    const { isTestnet } = this.store('main.networks', chain.type, chain.id)
    const { nativeCurrency } = this.store('main.networksMeta', chain.type, chain.id)

    const maxGas = BigNumber(req.data.gasLimit, 16)
    const maxFeePerGas = BigNumber(req.data[usesBaseFee(req.data) ? 'maxFeePerGas' : 'gasPrice'])
    const maxFee = new DisplayValue(maxFeePerGas.multipliedBy(maxGas))
    const { displayEther } = maxFee.toEther(6, -18)

    // accounts for two potential 12.5% block fee increases
    const reduceFactor = BigNumber(9).dividedBy(8)
    const minFeePerGas = maxFeePerGas.dividedBy(reduceFactor).dividedBy(reduceFactor)

    // accounts for the 50% padding in the gas estimate in the provider
    const minGas = maxGas.dividedBy(BigNumber(1.5))
    const minFee = new DisplayValue(minFeePerGas.multipliedBy(minGas))
    
    return (
      <ClusterBox title='fee' animationSlot={this.props.i}>
        <Cluster>
          <ClusterRow>
            <ClusterColumn>
              <ClusterValue onClick={() => {
                link.send('nav:update', 'panel', { data: { step: 'adjustFee' } })
              }}>
                <GasDisplay maxFeePerGas={new DisplayValue(maxFeePerGas)} />
              </ClusterValue>
            </ClusterColumn>
            <ClusterColumn grow={2}>
              <ClusterValue>
                <div className='txSendingValue'>
                  <span className='txSendingValueSymbol'>{nativeCurrency.symbol}</span>
                  <span className='txSendingValueAmount'>{displayEther}</span>
                </div>
              </ClusterValue>
              <ClusterValue>
                <USDEstimateDisplay minFee={minFee} maxFee={maxFee} nativeCurrency={nativeCurrency} isTestnet={isTestnet} />
              </ClusterValue>
            </ClusterColumn>
          </ClusterRow>
          {req.feesUpdatedByUser ? (
            <ClusterRow>
              <ClusterValue>
                <div className='clusterTag'>
                  {`Gas values set by user`}
                </div>
              </ClusterValue>
            </ClusterRow>
          ) : req.data.gasFeesSource !== GasFeesSource.Frame ? (
            <ClusterRow>
              <ClusterValue>
                <div className='clusterTag'>
                  {`Gas values set by ${req.data.gasFeesSource}`}
                </div>
              </ClusterValue>
            </ClusterRow>
          ) : null}
        </Cluster>
      </ClusterBox>
    )
  }
}

export default Restore.connect(TxFee)
