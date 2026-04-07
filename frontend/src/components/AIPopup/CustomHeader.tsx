import React from 'react';
import { X } from '@phosphor-icons/react';

interface CustomHeaderProps {
  onClose: () => void;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({ onClose }) => {
  // Force immediate drag region application
  React.useEffect(() => {
    const headerElement = document.querySelector('.custom-header');
    if (headerElement) {
      (headerElement as HTMLElement).style.setProperty('-webkit-app-region', 'drag');
      // Also ensure no-drag elements are properly set
      const noDragElements = document.querySelectorAll('.no-drag');
      noDragElements.forEach((el) => {
        (el as HTMLElement).style.setProperty('-webkit-app-region', 'no-drag');
      });
    }
  }, []);

  return (
    <div 
      className="custom-header"
      style={{
        height: '44px',
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(25px) saturate(200%) brightness(110%)',
        WebkitBackdropFilter: 'blur(25px) saturate(200%) brightness(110%)',
        borderRadius: '16px 16px 0 0',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        cursor: 'move',
        WebkitAppRegion: 'drag'
      } as React.CSSProperties & { WebkitAppRegion: string }}
    >
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={async () => {
            try {
              // Close the Electron window directly
              if (window.electronAPI?.closeWindow) {
                await window.electronAPI.closeWindow();
              } else {
                // Fallback to the onClose callback
                onClose();
              }
            } catch (error) {
              console.error('Failed to close window:', error);
              // Fallback to the onClose callback
              onClose();
            }
          }}
          className="close-btn"
          style={{
            width: '24px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(15px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <X size={16} color="currentColor" />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            marginRight: '4px'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          className="no-drag">
            Ask AI
          </span>
          <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(15px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '20px',
            textAlign: 'center'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          className="no-drag"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            ⌘
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(15px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '20px',
            textAlign: 'center'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          className="no-drag"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            ⇧
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(15px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '20px',
            textAlign: 'center'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          className="no-drag"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            A
          </div>
        </div>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '500',
          marginRight: '4px'
        } as React.CSSProperties & { WebkitAppRegion: string }}
        className="no-drag">
          Show/Hide
        </span>
        <div style={{
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(15px) saturate(150%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minWidth: '20px',
          textAlign: 'center'
        } as React.CSSProperties & { WebkitAppRegion: string }}
        className="no-drag"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
            ⌘
        </div>
                  <div style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(15px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '20px',
            textAlign: 'center'
          } as React.CSSProperties & { WebkitAppRegion: string }}
          className="no-drag"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            \
          </div>
      </div>
    </div>
  );
};
