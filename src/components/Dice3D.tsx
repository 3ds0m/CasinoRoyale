import React from 'react';

interface Dice3DProps {
  value: number | null;
  rolling: boolean;
}

// Rotation angles to display each face of the 3D cube facing front
const FACE_ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
  2: 'rotateX(0deg) rotateY(-90deg) rotateZ(0deg)', // Left/Right depends on map, standard: 2 is Left
  3: 'rotateX(90deg) rotateY(0deg) rotateZ(0deg)',
  4: 'rotateX(-90deg) rotateY(0deg) rotateZ(0deg)',
  5: 'rotateX(0deg) rotateY(90deg) rotateZ(0deg)',
  6: 'rotateX(180deg) rotateY(0deg) rotateZ(0deg)',
};

export const Dice3D: React.FC<Dice3DProps> = ({ value, rolling }) => {
  // Determine style rotation
  const rotationStyle = value ? FACE_ROTATIONS[value] : 'rotateX(45deg) rotateY(45deg) rotateZ(0deg)';

  return (
    <div className={`dice-3d-wrap ${rolling ? 'is-rolling' : ''}`}>
      <div 
        className="dice-3d-cube"
        style={{
          transform: rolling ? undefined : rotationStyle
        }}
      >
        {/* Face 1: Front */}
        <div className="dice-face face-front">
          <span className="dice-dot dot-center" />
        </div>

        {/* Face 2: Left */}
        <div className="dice-face face-left">
          <span className="dice-dot dot-top-left" />
          <span className="dice-dot dot-bottom-right" />
        </div>

        {/* Face 3: Top */}
        <div className="dice-face face-top">
          <span className="dice-dot dot-top-left" />
          <span className="dice-dot dot-center" />
          <span className="dice-dot dot-bottom-right" />
        </div>

        {/* Face 4: Bottom */}
        <div className="dice-face face-bottom">
          <span className="dice-dot dot-top-left" />
          <span className="dice-dot dot-top-right" />
          <span className="dice-dot dot-bottom-left" />
          <span className="dice-dot dot-bottom-right" />
        </div>

        {/* Face 5: Right */}
        <div className="dice-face face-right">
          <span className="dice-dot dot-top-left" />
          <span className="dice-dot dot-top-right" />
          <span className="dice-dot dot-center" />
          <span className="dice-dot dot-bottom-left" />
          <span className="dice-dot dot-bottom-right" />
        </div>

        {/* Face 6: Back */}
        <div className="dice-face face-back">
          <span className="dice-dot dot-top-left" />
          <span className="dice-dot dot-top-right" />
          <span className="dice-dot dot-mid-left" />
          <span className="dice-dot dot-mid-right" />
          <span className="dice-dot dot-bottom-left" />
          <span className="dice-dot dot-bottom-right" />
        </div>
      </div>
    </div>
  );
};
