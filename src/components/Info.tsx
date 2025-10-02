import React from 'react';
import { MathJax } from 'better-react-mathjax';
import './Info.css';

interface InfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Info: React.FC<InfoProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content info-modal" onClick={e => e.stopPropagation()}>
        <h2>... angle between functions?</h2>
        <div className="info-text-block">
          <p>
            This game was made to prove the point that, although unfamiliar, the concept of inner products and
            angles between arbitrary elements in a Hilbert space can still make some geometric sense if you just train your 
            intuition a bit! Here we are considering a certain space of functions under the integral product:
            <MathJax>{`$$\\langle f, g \\rangle = \\int_a^b f(x) g(x) \\mathrm dx$$`}</MathJax>
            If we are to believe the lies of analytic geometry, then <MathJax inline>{`$\\langle f, g \\rangle = \\lVert f \\rVert \\lVert g \\rVert \\cos(\\theta)$`}</MathJax>, this way, if we divide by the norms of each 
            function and take the inverse cosine, we can define an angle between them as follows:
            <MathJax>{`$$\\theta = \\arccos\\left(\\frac{\\int_a^b f(x)g(x)\\mathrm dx}{\\sqrt{\\int_a^b f(x)^2 \\mathrm dx \\cdot \\int_a^b g(x)^2 \\mathrm dx}}\\right)$$`}</MathJax>
            Your objective here is to eyeball that number, good luck!
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
