// SettingsComponent.tsx (add to your React app)
import React, { useState, useEffect } from 'react';
import './SettingsComponent.styles.css';

interface Shortcut {
  accelerator: string;
  description: string;
}

// Convert an Electron accelerator string to a human-readable symbol string.
// e.g. "CommandOrControl+Shift+A" → "⌘⇧A" on macOS, "Ctrl+⇧A" elsewhere.
function formatAccelerator(accelerator: string, isMac: boolean): string {
  return accelerator
    .split('+')
    .map((part) => {
      switch (part) {
        case 'CommandOrControl': return isMac ? '⌘' : 'Ctrl';
        case 'Command':          return '⌘';
        case 'Control':          return isMac ? '⌃' : 'Ctrl';
        case 'Shift':            return '⇧';
        case 'Alt':              return isMac ? '⌥' : 'Alt';
        case '\\':               return '\\';
        default:                 return part.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}

const SettingsComponent: React.FC = () => {
  const [multiPopupMode, setMultiPopupMode] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);

  const isMac = window.electronAPI?.platform === 'darwin';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.electronAPI) {
        const enabled = await window.electronAPI.getMultiPopupMode().catch(() => false);
        const shortcutList = window.electronAPI.getShortcuts
          ? await window.electronAPI.getShortcuts().catch(() => [])
          : [];
        setMultiPopupMode(enabled);
        setShortcuts(shortcutList);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMultiPopup = async (enabled: boolean) => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        await window.electronAPI.toggleMultiPopupMode(enabled);
        setMultiPopupMode(enabled);
      }
    } catch (error) {
      console.error('Failed to toggle multi-popup mode:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section" style={{ color: '#999', fontSize: 14 }}>
        Loading settings…
      </div>
    );
  }

  return (
    <>
      <div className="settings-section">
        <h3>AI Popup Settings</h3>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={multiPopupMode}
              onChange={(e) => handleToggleMultiPopup(e.target.checked)}
              disabled={loading}
            />
            <span className="checkmark"></span>
            Allow Multiple AI Popups
          </label>
          <p className="setting-description">
            {multiPopupMode
              ? "Multiple AI popups can exist simultaneously with offset positioning"
              : "Only one AI popup allowed at a time (recommended)"
            }
          </p>
        </div>

        <div className="setting-status">
          Current mode: <strong>{multiPopupMode ? 'Multi-window' : 'Single window'}</strong>
        </div>
      </div>

      {shortcuts.length > 0 && (
        <div className="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <table className="shortcuts-table">
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.accelerator} className="shortcut-row">
                  <td className="shortcut-key">
                    <kbd>{formatAccelerator(s.accelerator, isMac)}</kbd>
                  </td>
                  <td className="shortcut-description">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default SettingsComponent;
