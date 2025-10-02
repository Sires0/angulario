
import React, { useState, useEffect } from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import './Settings.css';
import { AppSettings } from '../App';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  // Use local state to handle form changes without affecting the main app state on every keystroke.
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Sync local state if the modal is reopened with different props
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    const newSettings = {
        ...localSettings,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    };

    // Update the local state for all changes
    setLocalSettings(newSettings);

    // For instant visual feedback, update cosmetic settings in the parent immediately.
    const cosmeticChanges = ['isDarkMode', 'lineThickness', 'func1Color', 'func2Color'];
    if (cosmeticChanges.includes(name)) {
        onSettingsChange(newSettings);
    }
  };

  const handleClose = () => {
    // On close, always commit the final local state to ensure backend-related changes are applied.
    onSettingsChange(localSettings);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="settings-grid">

          <h3 className="settings-header">For Noobs</h3>

          {/* Unitary Mode */}
          <label>Unitary Mode</label>
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" name="isUnitaryMode" checked={localSettings.isUnitaryMode} onChange={handleInputChange} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="settings-explainer">
            <MathJax inline>{`$\\hat f = \\frac{f}{\\| f \\|}, \\hat g = \\frac{g}{\\| g \\|}$`}</MathJax>
          </div>

          {/* Acute Angles Only */}
          <label>Acute Angles Only</label>
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" name="acuteAnglesOnly" checked={localSettings.acuteAnglesOnly} onChange={handleInputChange} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="settings-explainer">
            <MathJax inline>{`$\\langle f, g \\rangle \\geq 0 \\Rightarrow 0^\\circ \\le \\theta \\le 90^\\circ$`}</MathJax>
          </div>

          {/* Easy Interval Toggle */}
          <label>Easy Interval</label>
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" name="isEasyInterval" checked={localSettings.isEasyInterval} onChange={handleInputChange} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="settings-explainer">
            <MathJax inline>{`$I = [-1, 1]$`}</MathJax>
          </div>

          <h3 className="settings-header">Style</h3>

          {/* Dark Mode */}
          <label>Dark Mode</label>
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" name="isDarkMode" checked={localSettings.isDarkMode} onChange={handleInputChange} />
              <span className="slider"></span>
            </label>
          </div>
          <div></div>{/* Placeholder */}

          {/* Line Thickness Slider */}
          <label>Line Thickness</label>
          <input type="number" name="lineThickness" min="1" max="10" value={localSettings.lineThickness} onChange={handleInputChange} />
          <div></div>{/* Placeholder */}

          {/* Colors */}
          <label>Function Colors</label>
          <div className="color-inputs-container">
            <input type="color" name="func1Color" value={localSettings.func1Color} onChange={handleInputChange} />
            <input type="color" name="func2Color" value={localSettings.func2Color} onChange={handleInputChange} />
          </div>
          <div></div>{/* Placeholder */}
        </div>
        <div className="modal-actions">
          <button onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
