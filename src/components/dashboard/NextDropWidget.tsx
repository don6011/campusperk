import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentDropWindow, getNextDropWindow, DROP_WINDOWS, formatCountdown } from "@/lib/deal-drops";

export function NextDropWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentWindow = getCurrentDropWindow(now);
  const next = getNextDropWindow(now);
  const msUntilNext = next.startsAt.getTime() - now.getTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-primary/20 bg-card relative overflow-hidden glow-featured">
        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/8 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative z-10 p-3.5 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-primary/20"
            style={{ filter: "drop-shadow(0 0 6px hsl(217 91% 60% / 0.3))" }}
          >
            <Zap className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            {currentWindow ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-foreground">
                    {DROP_WINDOWS[currentWindow].label} is Live!
                  </span>
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-[9px] font-bold gap-1 animate-pulse">
                    <Zap className="h-2.5 w-2.5" /> LIVE
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Check the feed for surprise deals dropping now
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-foreground">
                    Next Drop Window
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {DROP_WINDOWS[next.window].label} starts in{" "}
                    <span className="font-bold text-primary">{formatCountdown(msUntilNext)}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
