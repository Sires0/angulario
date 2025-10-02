import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions, Scale, Tick, ScriptableScaleContext } from 'chart.js';
import { MathNode } from 'mathjs';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import './App.css';
import { Settings } from './components/Settings';
import { Stats, RoundData } from './components/Stats';
import { Info } from './components/Info';
import { useCountUp } from './hooks/useCountUp';
import { getNewFunctions, calculateAngle, math } from './gameLogic';

// --- Type Definitions ---
type GameState = 'loading' | 'playing' | 'results';

export interface AppSettings {
  isDarkMode: boolean;
  isUnitaryMode: boolean;
  acuteAnglesOnly: boolean;
  isEasyInterval: boolean;
  lineThickness: number;
  func1Color: string;
  func2Color: string;
}

type PlotData = {
  x_values: number[];
  y1_values: (number | null)[];
  y2_values: (number | null)[];
};

type ResultData = {
  actual_angle: number;
  score: number;
  f1_str: string;
  f2_str: string;
};

interface IRoundData {
    angle: number;
    f1_str: string;
    f2_str: string;
}

const defaultSettings: AppSettings = {
  isDarkMode: false,
  isUnitaryMode: false,
  acuteAnglesOnly: false,
  isEasyInterval: true, // Default to easy interval
  lineThickness: 3,
  func1Color: '#dc3232',
  func2Color: '#3264dc',
};

const PLOT_SAMPLES = 200;

const mathJaxConfig = {
  tex: {
    inlineMath: [['$', '$'], ['\(', '\)']],
    displayMath: [['$$', '$$'], ['\\\[', '\\\]']]
  }
};

// --- React Component ---
function App() {
  // --- State Management ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('angulario-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Ensure new settings have defaults if not in localStorage
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
    }
    return defaultSettings;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [gameState, setGameState] = useState<GameState>('loading');
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [roundData, setRoundData] = useState<IRoundData | null>(null);
  const [guess, setGuess] = useState<string>('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const animatedScore = useCountUp(totalScore, 500);
  const [history, setHistory] = useState<RoundData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isInitialRender = useRef(true);
  const guessInputRef = useRef<HTMLInputElement>(null);

  // --- Local Game Logic ---
  const startNewRound = useCallback(async (isFirstRound = false) => {
    setError(null);
    setGameState('loading');
    setResult(null);
    setGuess('');

    setTimeout(() => {
        // Determine interval for the round
        let currentInterval: [number, number];
        if (settings.isEasyInterval) {
            currentInterval = [-1, 1];
        } else {
            let a, b;
            do {
                a = Math.floor(Math.random() * 11) - 5; // -5 to 5
                b = Math.floor(Math.random() * 11) - 5;
            } while (a === b);
            currentInterval = [Math.min(a, b), Math.max(a, b)];
        }

        let angleResult: { angle: number | null, f1_final: MathNode, f2_final: MathNode } | null = null;
        let f1_round: MathNode, f2_round: MathNode;

        while (angleResult === null || angleResult.angle === null) {
            const funcs = getNewFunctions(currentInterval);
            let f1_orig = funcs.f1;
            let f2_orig = funcs.f2;

            // --- New Scaling Logic ---
            const x_vals_for_scaling = Array.from({ length: 100 }, (_, i) => {
                const t = i / 99;
                return currentInterval[0] + t * (currentInterval[1] - currentInterval[0]);
            });
            const y1_vals = x_vals_for_scaling.map(x => f1_orig.evaluate({ x }));
            const y2_vals = x_vals_for_scaling.map(x => f2_orig.evaluate({ x }));

            const max_abs_y1 = Math.max(...y1_vals.filter(y => isFinite(y)).map(Math.abs));
            const max_abs_y2 = Math.max(...y2_vals.filter(y => isFinite(y)).map(Math.abs));

            f1_round = f1_orig;
            f2_round = f2_orig;

            if (max_abs_y1 > 0 && max_abs_y2 > 0) {
                const ratio = max_abs_y1 > max_abs_y2 ? max_abs_y1 / max_abs_y2 : max_abs_y2 / max_abs_y1;
                if (ratio > 5) {
                    const k = Math.ceil(ratio / 5);
                    if (max_abs_y1 > max_abs_y2) {
                        f2_round = math.parse(`(${f2_orig.toString()}) * ${k}`);
                    } else {
                        f1_round = math.parse(`(${f1_orig.toString()}) * ${k}`);
                    }
                }
            }
            // --- End Scaling Logic ---

            angleResult = calculateAngle(f1_round, f2_round, settings.isUnitaryMode, currentInterval, settings.acuteAnglesOnly);
        }

        const { angle, f1_final, f2_final } = angleResult; // f1_final and f2_final have been potentially flipped for acute mode

        const newRoundData: IRoundData = {
            angle: angle!,
            f1_str: f1_final.toTex({parenthesis: 'auto'}),
            f2_str: f2_final.toTex({parenthesis: 'auto'}),
        };
        setRoundData(newRoundData);

        // Generate plot data from the final, potentially scaled and flipped functions
        const x_values = Array.from({ length: PLOT_SAMPLES }, (_, i) => {
            const t = i / (PLOT_SAMPLES - 1);
            return currentInterval[0] + t * (currentInterval[1] - currentInterval[0]);
        });
        const y1_raw = x_values.map(x => f1_final.evaluate({ x }));
        const y2_raw = x_values.map(x => f2_final.evaluate({ x }));

        const y1_safe = y1_raw.map(y => isFinite(y) ? y : null);
        const y2_safe = y2_raw.map(y => isFinite(y) ? y : null);

        const newPlotData: PlotData = {
            x_values,
            y1_values: y1_safe,
            y2_values: y2_safe,
        };
        setPlotData(newPlotData);

        if (isFirstRound) {
            setRoundNumber(1);
        } else {
            setRoundNumber(prev => prev + 1);
        }
        setGameState('playing');
    }, 50);

  }, [settings.isUnitaryMode, settings.acuteAnglesOnly, settings.isEasyInterval]);

  const submitGuess = () => {
    if (!roundData || guess === '') return;
    
    const actual_angle = roundData.angle;
    const diff = Math.abs(actual_angle - parseFloat(guess));
    const score = 100 * Math.pow(Math.max(0, 1 - diff / 180), 3);

    const newResult: ResultData = {
        actual_angle,
        score,
        f1_str: roundData.f1_str,
        f2_str: roundData.f2_str,
    };

    setResult(newResult);
    setTotalScore(prev => prev + score);
    
    const newHistoryEntry: RoundData = {
      guess: parseFloat(guess),
      actual: actual_angle,
      diff: diff,
      score: score,
    };
    setHistory(prev => [...prev, newHistoryEntry]);

    setGameState('results');
  };

  const handleGuessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value === "") {
      setGuess("");
      return;
    }
    const numValue = Number(value);
    const maxValue = settings.acuteAnglesOnly ? 90 : 180;
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxValue) {
      setGuess(value);
    }
  };

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('angulario-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    startNewRound(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    setTotalScore(0);
    setHistory([]);
    startNewRound(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.isUnitaryMode, settings.acuteAnglesOnly, settings.isEasyInterval]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && gameState === 'results') {
        startNewRound(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [gameState, startNewRound]);

  useEffect(() => {
    if (gameState === 'playing') {
      guessInputRef.current?.focus();
    }
  }, [gameState]);

  // --- Chart.js Configuration ---
  const chartData = useMemo(() => {
    if (!plotData) return { labels: [], datasets: [] };
    return {
      labels: plotData.x_values,
      datasets: [
        { label: 'Function 1', data: plotData.y1_values, borderColor: settings.func1Color, borderWidth: settings.lineThickness, pointRadius: 0, spanGaps: true },
        { label: 'Function 2', data: plotData.y2_values, borderColor: settings.func2Color, borderWidth: settings.lineThickness, pointRadius: 0, spanGaps: true },
      ],
    };
  }, [plotData, settings.func1Color, settings.func2Color, settings.lineThickness]);

  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    const gridColor = settings.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const zeroLineColor = settings.isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    const fontColor = settings.isDarkMode ? '#e0e0e0' : '#333';

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'x', color: fontColor },
          ticks: { color: fontColor, autoSkip: false, maxRotation: 0, minRotation: 0,
            callback: function(this: Scale, value: number | string, index: number, ticks: Tick[]): string | null {
              const isFirst = index === 0;
              const isMiddle = index === Math.floor(ticks.length / 2);
              const isLast = index === ticks.length - 1;
              if (isFirst || isMiddle || isLast) return Number(this.getLabelForValue(Number(value))).toFixed(1);
              return null;
            }
          },
          grid: { color: gridColor },
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'y', color: fontColor },
          grid: {
            lineWidth: (context: ScriptableScaleContext) => (context.tick.value === 0 ? 2 : 1),
            color: (context: ScriptableScaleContext) => (context.tick.value === 0 ? zeroLineColor : gridColor),
          },
          ticks: { color: fontColor,
            callback: function(value: string | number, index: number, ticks: Tick[]): string | null {
              const isMin = index === 0;
              const isMax = index === ticks.length - 1;
              const isZero = Number(value) === 0;
              if (isMin || isMax || isZero) return Number(value).toFixed(1);
              return null;
            }
          }
        },
      },
      plugins: { legend: { display: false } },
    };
  }, [settings.isDarkMode]);

  // --- Render Logic ---
  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className={`App ${settings.isDarkMode ? 'dark-mode' : ''}`}>
        <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} />
        <Stats isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} history={history} settings={settings} />
        <Info isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
        <header className="header">
          <h1>Angulário</h1>
          <div className="stats">
              <div>Round: {roundNumber}</div>
              <div>Total Score: {animatedScore.toFixed(0)}</div>
          </div>
          <div className="header-controls">
              <button className="settings-button icon-button" title="Info" onClick={() => setIsInfoOpen(true)}>ℹ️</button>
              <button className="settings-button icon-button" title="Statistics" onClick={() => setIsStatsOpen(true)}>📊</button>
              <button className="settings-button" title="Settings" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
          </div>
        </header>
        <main className="game-container">
          {gameState === 'loading' ? (
              <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                  <p>Calculating...</p>
              </div>
          ) : error ? (
              <p>Error: {error}</p>
          ) : (
            <>
              <div className="graph-container">
                <div className="formula-header">
                  {gameState === 'results' && result && (
                    <>
                      <span style={{ color: settings.func1Color }}><MathJax inline>{`$${result.f1_str}$`}</MathJax></span>
                      <span style={{ color: settings.func2Color }}><MathJax inline>{`$${result.f2_str}$`}</MathJax></span>
                    </>
                  )}
                </div>
                <Line key={roundNumber} options={chartOptions} data={chartData!} />
              </div>
              {gameState === 'playing' && (
                <div className="controls">
                  <p>Guess the angle between the functions:</p>
                  <div className="input-wrapper">
                      <input 
                          ref={guessInputRef}
                          type="number" 
                          value={guess} 
                          onChange={handleGuessChange} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              submitGuess();
                            }
                          }} 
                      />
                      <span>°</span>
                  </div>
                  <button onClick={submitGuess} disabled={!guess}>Submit Guess</button>
                </div>
              )}
              {gameState === 'results' && result && (
                <div className="results">
                  <h2>Actual Angle: {result.actual_angle.toFixed(2)}°</h2>
                  <h3>Round Score: {result.score.toFixed(0)} / 100</h3>
                  <button onClick={() => startNewRound(false)}>Next Round</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </MathJaxContext>
  );
}

export default App;
