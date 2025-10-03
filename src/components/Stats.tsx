import React, { useMemo } from 'react';
import { AppSettings } from '../App';
import './Stats.css';

export interface RoundData {
  guess: number;
  actual: number;
  diff: number;
  score: number;
  isEasy: boolean;
}

interface StatsProps {
  isOpen: boolean;
  onClose: () => void;
  history: RoundData[];
  settings: AppSettings;
}

export const Stats: React.FC<StatsProps> = ({ isOpen, onClose, history }) => {
  const stats = useMemo(() => {
    const totalRounds = history.length;
    if (totalRounds === 0) {
      return { avgScore: 0, avgDiff: 0, avgDiffLast10: 0, medianDiff: 0 };
    }

    const avgScore = history.reduce((acc, h) => acc + h.score, 0) / totalRounds;
    const avgDiff = history.reduce((acc, h) => acc + h.diff, 0) / totalRounds;

    const last10History = history.slice(-10);
    const avgDiffLast10 = last10History.reduce((acc, h) => acc + h.diff, 0) / last10History.length;

    const sortedDiffs = [...history].map(h => h.diff).sort((a, b) => a - b);
    const mid = Math.floor(totalRounds / 2);
    const medianDiff = totalRounds % 2 !== 0 ? sortedDiffs[mid] : (sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2;

    return { avgScore, avgDiff, avgDiffLast10, medianDiff };
  }, [history]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Session Stats</h2>
        
        <div className="summary-grid">
            <div className="summary-item">
                <h4>Avg. Score</h4>
                <p>{stats.avgScore.toFixed(1)}</p>
            </div>
            <div className="summary-item">
                <h4>Avg. Diff</h4>
                <p>{stats.avgDiff.toFixed(2)}°</p>
            </div>
            <div className="summary-item">
                <h4>Avg. Diff (Last 10)</h4>
                <p>{stats.avgDiffLast10.toFixed(2)}°</p>
            </div>
            <div className="summary-item">
                <h4>Median Diff</h4>
                <p>{stats.medianDiff.toFixed(2)}°</p>
            </div>
        </div>

        <div className="history-table-container">
          {history.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Guess</th>
                  <th>Actual</th>
                  <th>Diff</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((round, index) => (
                  <tr key={index}>
                    <td>{history.length - index}</td>
                    <td>{round.guess.toFixed(1)}°</td>
                    <td>{round.actual.toFixed(1)}°</td>
                    <td>{round.diff.toFixed(1)}°</td>
                    <td>{round.score.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{textAlign: 'center', padding: '2rem'}}>Play a round to see your stats!</p>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};