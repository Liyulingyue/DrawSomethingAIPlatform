import { useState } from 'react'
import { HeartOutlined, QrcodeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import './AppDonate.css'

function AppDonate() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation('donate')

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="app-donate-container">
        <div className="app-donate-content">
          <div className="app-donate-header">
            <h1 className="app-donate-title">
              <HeartOutlined style={{ marginRight: '12px' }} />
              {t('donate.title')}
            </h1>
            <p className="app-donate-subtitle">
              {t('donate.subtitle')}
            </p>
          </div>

          {/* 服务点调用说明 */}
          <div className="donate-info-box">
            <div className="donate-info-content">
              <h3 className="donate-info-title">💡 {t('donate.about.title')}</h3>
              <div className="donate-info-text">
                <p><strong>{t('donate.about.p1')}</strong></p>
                <p>{t('donate.about.p2')}</p>
                <p>{t('donate.about.p3')}</p>
                <p className="donate-recommendation">
                  💰 <strong>{t('donate.recommend.amount')}</strong>（{t('donate.recommend.note')})
                </p>
                <p className="donate-info-note"><small>{t('donate.about.note')}</small></p>
              </div>
            </div>
          </div>

          <div className="app-donate-methods">
            {/* 微信支付 */}
            <div className="donate-method">
              <div className="donate-method-header">
                <div className="donate-icon wechat">
                  <span>微信</span>
                </div>
                <h3>{t('donate.methods.wechat.title')}</h3>
              </div>
              <div className="donate-qr-container">
                <img 
                  src="/wechat-qr.jpg" 
                  alt={t('donate.methods.wechat.alt')} 
                  className="donate-qr-image"
                  onLoad={(e) => {
                    // 图片加载成功，确保占位符隐藏
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = 'none';
                    }
                  }}
                  onError={(e) => {
                    // 图片加载失败，显示占位符
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                />
                <div className="donate-qr-placeholder" style={{ display: 'none' }}>
                  <QrcodeOutlined style={{ fontSize: '48px', color: '#666' }} />
                  <p>{t('donate.methods.wechat.placeholder')}</p>
                  <small>{t('donate.methods.wechat.hint')}</small>
                </div>
              </div>
            </div>

            {/* 支付宝 */}
            {/* <div className="donate-method">
              <div className="donate-method-header">
                <div className="donate-icon alipay">
                  <span>支付宝</span>
                </div>
                <h3>支付宝</h3>
              </div>
              <div className="donate-qr-container">
                <div className="donate-qr-placeholder">
                  <QrcodeOutlined style={{ fontSize: '48px', color: '#666' }} />
                  <p>支付宝二维码</p>
                  <small>请替换为您的实际二维码图片</small>
                </div>
              </div>
            </div> */}

            {/* 数字货币 */}
            {/* <div className="donate-method">
              <div className="donate-method-header">
                <div className="donate-icon crypto">
                  <span>₿</span>
                </div>
                <h3>数字货币</h3>
              </div>
              <div className="crypto-addresses">
                <div className="crypto-item">
                  <span className="crypto-label">BTC:</span>
                  <code className="crypto-address">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')}
                    size="small"
                  />
                </div>
                <div className="crypto-item">
                  <span className="crypto-label">ETH:</span>
                  <code className="crypto-address">0x742d35Cc6634C0532925a3b844Bc454e4438f44e</code>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')}
                    size="small"
                  />
                </div>
                <div className="crypto-item">
                  <span className="crypto-label">USDT (TRC20):</span>
                  <code className="crypto-address">TJjhx8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8</code>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyAddress('TJjhx8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8x8')}
                    size="small"
                  />
                </div>
              </div>
            </div> */}
          </div>



          {/* <div className="app-donate-footer">
            <div className="donate-message">
              <HeartOutlined style={{ fontSize: '20px', color: '#ff4d4f', marginRight: '8px' }} />
              <span>感谢您的支持！每一点爱心都让我们走得更远</span>
            </div>
          </div> */}
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default AppDonate