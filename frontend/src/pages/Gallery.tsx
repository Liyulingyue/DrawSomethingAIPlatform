import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { API_BASE_URL } from '../utils/api';
import AppSidebar from '../components/AppSidebar';
import SidebarTrigger from '../components/SidebarTrigger';
import AppFooter from '../components/AppFooter';
import './Gallery.css';

interface GalleryItem {
  filename: string;
  name: string;
  timestamp: string;
}

const Gallery: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gallery/list`);
      if (response.ok) {
        const data = await response.json();
        setGalleryItems(data);
      } else {
        console.error('Failed to fetch gallery items');
      }
    } catch (error) {
      console.error('Error fetching gallery items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="gallery-container">
        {/* 标题区域 */}
        <div className="gallery-title-section">
          <h1 className="gallery-page-title">画廊</h1>
        </div>

        {/* 画廊内容区域 */}
        <div className="gallery-content">
          {galleryItems.length > 0 ? (
            <div className="gallery-grid">
              {galleryItems.map((item) => (
                <div key={item.filename} className="gallery-item">
                  <img
                    src={`${API_BASE_URL}/gallery/static/${item.filename}`}
                    alt={`由 ${item.name} 绘制`}
                    className="gallery-image"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setPreviewImg(`${API_BASE_URL}/gallery/static/${item.filename}`);
                      setPreviewVisible(true);
                    }}
                  />
                  <div className="gallery-info">
                    <p className="gallery-name">{item.name}</p>
                    <p className="gallery-timestamp">{item.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gallery-empty">
              <p>画廊中还没有作品，快去绘制并发布吧！</p>
            </div>
          )}
        </div>

        <AppFooter />
      </div>
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
        bodyStyle={{ textAlign: 'center', padding: 0 }}
      >
        {previewImg && (
          <img
            src={previewImg}
            alt="大图预览"
            style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
          />
        )}
      </Modal>
    </>
  );
};

export default Gallery;