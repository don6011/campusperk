import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles, Trophy } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { rarityClassName, useBadgeCollection, type BadgeCollectionItem } from "@/hooks/use-badge-collection";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

const rarityOrder = ["Common", "Rare", "Epic", "Legendary"] as const;

function BadgeCard({ badge, index }: { badge: BadgeCollectionItem; index: number }) {
  const Icon = badge.icon;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={index}>
      <Card className={`h-full overflow-hidden border-border bg-card transition-all ${badge.earned ? "shadow-sm" : "opacity-80"}`}>
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${rarityClassName(badge.rarity)} ${badge.earned ? "" : "grayscale"}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={`${rarityClassName(badge.rarity)} text-xs`}>
                {badge.rarity}
              </Badge>
              {!badge.earned && (
                <Badge variant="outline" className="gap-1 border-border bg-secondary/40 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
          </div>

          <h3 className="font-display text-lg font-bold text-foreground">{badge.title}</h3>
          <p className="mt-2 min-h-[3rem] text-sm leading-6 text-muted-foreground">{badge.description}</p>

          <div className="mt-5 rounded-xl border border-border bg-secondary/25 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unlock Requirement</p>
            <p className="mt-1 text-sm font-medium text-foreground">{badge.requirement}</p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
                {badge.current.toLocaleString()} / {badge.target.toLocaleString()}
              </span>
            </div>
            <Progress value={badge.progress} className={`h-2.5 overflow-hidden ${badge.earned ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Badges() {
  const { data: collection = [], isLoading } = useBadgeCollection();
  const earned = collection.filter((badge) => badge.earned);
  const locked = collection.filter((badge) => !badge.earned);
  const completion = collection.length ? Math.round((earned.length / collection.length) * 100) : 0;
  const legendaryEarned = earned.filter((badge) => badge.rarity === "Legendary").length;

  const byRarity = rarityOrder.map((rarity) => ({
    rarity,
    earned: earned.filter((badge) => badge.rarity === rarity).length,
    total: collection.filter((badge) => badge.rarity === rarity).length,
  }));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/4 -translate-y-1/4 rounded-full bg-primary/15 blur-[64px]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 gap-1.5 border-primary/30 bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Badge Collection Center
              </Badge>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Your CampusPerk badge collection</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Track earned badges, locked rewards, rarity, and the next actions that move your CampusPerk status forward.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/settings">Account Badge Preview <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Badges Earned", value: `${earned.length}/${collection.length}`, icon: Trophy },
            { label: "Completion", value: `${completion}%`, icon: Sparkles },
            { label: "Locked Badges", value: locked.length.toString(), icon: Lock },
            { label: "Legendary Earned", value: legendaryEarned.toString(), icon: Trophy },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{isLoading ? "-" : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Collection Progress</h2>
                <p className="text-sm text-muted-foreground">Rarity progress across Common, Rare, Epic, and Legendary badges.</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">{completion}% complete</Badge>
            </div>
            <Progress value={completion} className="h-3 overflow-hidden [&>div]:bg-emerald-500" />
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {byRarity.map((item) => (
                <div key={item.rarity} className="rounded-xl border border-border bg-secondary/25 p-3">
                  <Badge variant="outline" className={`${rarityClassName(item.rarity)} mb-2 text-xs`}>{item.rarity}</Badge>
                  <p className="font-display text-xl font-bold text-foreground">{item.earned}/{item.total}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Earned Badges</h2>
            <p className="mt-1 text-sm text-muted-foreground">Badges already unlocked by your CampusPerk activity.</p>
          </div>
          {earned.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">No earned badges yet.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {earned.map((badge, index) => <BadgeCard key={badge.id} badge={badge} index={index} />)}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Locked Badges</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep saving, verifying, referring, and submitting deals to unlock these.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {locked.map((badge, index) => <BadgeCard key={badge.id} badge={badge} index={index} />)}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
