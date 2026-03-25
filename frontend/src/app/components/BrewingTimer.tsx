import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Clock, Thermometer, Play, Pause, RotateCcw } from 'lucide-react';
import { Tea } from './TeaCard';
import { motion } from 'motion/react';

interface BrewingTimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tea: Tea | null;
  autoStart?: boolean;
}

export function BrewingTimer({ open, onOpenChange, tea, autoStart = false }: BrewingTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (tea && open) {
      const seconds = tea.brewTime * 60;
      setTimeLeft(seconds);
      setTotalTime(seconds);
      // Automatycznie uruchom timer jeśli autoStart jest włączone
      setIsRunning(autoStart);
    }
  }, [tea, open, autoStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsRunning(false);
            // Odtwórz dźwięk lub powiadomienie
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleReset = () => {
    if (tea) {
      setTimeLeft(tea.brewTime * 60);
      setIsRunning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  if (!tea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{tea.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center gap-8 p-6 bg-muted rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Temperatura</span>
              </div>
              <p className="text-3xl font-bold">{tea.temperature}°C</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Czas</span>
              </div>
              <p className="text-3xl font-bold">{tea.brewTime} min</p>
            </div>
          </div>

          <div className="text-center space-y-4">
            {/* Animacja parzenia herbaty - zawsze renderowana, kontrola widoczności przez opacity */}
            <div 
              className="relative h-48 mb-4 flex items-end justify-center transition-opacity duration-300"
              style={{ opacity: isRunning && timeLeft > 0 ? 1 : 0, pointerEvents: isRunning && timeLeft > 0 ? 'auto' : 'none' }}
            >
              {/* Filiżanka */}
              <div className="relative z-10">
                <motion.div
                  className="w-32 h-24 border-4 border-primary rounded-b-3xl bg-gradient-to-b from-transparent to-amber-100 dark:to-amber-900/30 relative overflow-hidden"
                  animate={
                    isRunning ? {
                      boxShadow: [
                        '0 0 20px rgba(251, 191, 36, 0.3)',
                        '0 0 30px rgba(251, 191, 36, 0.5)',
                        '0 0 20px rgba(251, 191, 36, 0.3)',
                      ],
                    } : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* Poziom herbaty */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-800 dark:to-amber-600"
                    initial={{ height: '20%' }}
                    animate={{ height: `${Math.min(90, 20 + progress * 0.7)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  
                  {/* Bąbelki */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={`bubble-${i}`}
                      className="absolute w-2 h-2 bg-white/40 rounded-full"
                      style={{
                        left: `${20 + i * 15}%`,
                        bottom: '10%',
                      }}
                      animate={
                        isRunning ? {
                          y: [-40, -80],
                          opacity: [0, 1, 0],
                        } : {
                          y: -40,
                          opacity: 0
                        }
                      }
                      transition={{
                        duration: 2,
                        repeat: isRunning ? Infinity : 0,
                        delay: i * 0.3,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </motion.div>
                
                {/* Uchwyt filiżanki */}
                <div className="absolute -right-6 top-4 w-8 h-10 border-4 border-primary rounded-r-full border-l-0" />
              </div>
              
              {/* Para */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`steam-${i}`}
                    className="absolute w-12 h-12"
                    style={{ left: `${-20 + i * 15}px` }}
                    animate={
                      isRunning ? {
                        y: [0, -60],
                        opacity: [0.6, 0],
                        scale: [0.5, 1.5],
                      } : {
                        y: 0,
                        opacity: 0,
                        scale: 0.5
                      }
                    }
                    transition={{
                      duration: 3,
                      repeat: isRunning ? Infinity : 0,
                      delay: i * 0.5,
                      ease: 'easeOut',
                    }}
                  >
                    <div className="text-4xl opacity-40">💨</div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="text-6xl font-mono font-bold tracking-wider">
              {formatTime(timeLeft)}
            </div>
            <Progress value={progress} className="h-3" />
            {timeLeft === 0 && (
              <motion.p
                className="text-lg font-semibold text-primary"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [1, 0.8, 1],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ✨ Herbata jest gotowa! ✨
              </motion.p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="lg"
              className="w-32"
              disabled={timeLeft === 0}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pauza
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="w-32"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}