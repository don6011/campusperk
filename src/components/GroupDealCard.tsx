import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Share2, Clock, Flame, Check, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface GroupDealCardProps {
  groupDeal: {
    id: string;
    title: string;
    description?: string | null;
    required_participants: number;
    current_participants: number;
    status: string;
    expires_at: string;
    deal?: {
      discount_value: string | null;
      stores: { name: string; logo_url: string | null } | null;
    } | null;
  };
  hasJoined?: boolean;
  onJoin: (groupDealId: string) => void;
  isLoading?: boolean;
}

export function GroupDealCard({ groupDeal, hasJoined, onJoin, isLoading }: GroupDealCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const progress = Math.min((groupDeal.current_participants / groupDeal.required_participants) * 100, 100);
  const isUnlocked = groupDeal.current_participants >= groupDeal.required_participants;
  const storeName = groupDeal.deal?.stores?.name || "";
  const timeLeft = new Date(groupDeal.expires_at).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const isExpired = timeLeft <= 0;

  const shareUrl = `${window.location.origin}/group-deals/${groupDeal.id}`;
  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with your campus!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join this campus group deal: ${groupDeal.title}! 🔥🎓`)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this campus group deal: ${groupDeal.title}! 🔥 ${shareUrl}`)}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.12 } }}
    >
      <Card className={`relative overflow-hidden border-border bg-card premium-hover ${isUnlocked ? "ring-2 ring-accent/40 border-accent/30 glow-verified" : ""}`}>
        {/* Flame header for group deals */}
        <div className="px-4 py-2 bg-gradient-to-r from-destructive/10 via-gold/10 to-accent/10 border-b border-border flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-destructive" />
          <span className="text-[10px] font-bold text-foreground">🔥 Campus Group Deal</span>
          {!isExpired && !isUnlocked && (
            <span className="ml-auto text-[9px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {hoursLeft}h left
            </span>
          )}
          {isUnlocked && (
            <Badge className="ml-auto bg-accent/15 text-accent border-accent/30 text-[9px] font-bold gap-1">
              <Check className="h-2.5 w-2.5" /> Unlocked!
            </Badge>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Deal info */}
          <div className="flex items-center gap-3">
            {groupDeal.deal?.stores?.logo_url ? (
              <div className="logo-banner flex h-14 w-24 shrink-0 items-center justify-center rounded-xl overflow-hidden p-0">
                <img src={groupDeal.deal.stores.logo_url} alt={storeName} className="merchant-logo-panel--cover" />
              </div>
            ) : (
              <div className="logo-banner h-14 w-24 rounded-xl flex items-center justify-center shrink-0">
                <span className="font-display text-sm font-bold text-muted-foreground">{storeName.charAt(0) || "?"}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-sm text-foreground truncate">{groupDeal.title}</div>
              {groupDeal.description && (
                <div className="text-[11px] text-muted-foreground truncate">{groupDeal.description}</div>
              )}
            </div>
            {groupDeal.deal?.discount_value && (
              <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-bold shrink-0">
                {groupDeal.deal.discount_value}
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> Students Joined
              </span>
              <span className="font-bold text-foreground">
                {groupDeal.current_participants} / {groupDeal.required_participants}
              </span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <p className="text-[10px] text-muted-foreground">
              {isUnlocked
                ? "Deal unlocked for all participants! 🎉"
                : `${groupDeal.required_participants - groupDeal.current_participants} more students needed`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isExpired && !isUnlocked && !hasJoined && (
              <Button
                size="sm"
                className="flex-1 h-8 font-bold text-xs gap-1"
                onClick={() => onJoin(groupDeal.id)}
                disabled={isLoading}
              >
                <Users className="h-3 w-3" /> Join Group Deal
              </Button>
            )}
            {hasJoined && !isUnlocked && (
              <Button size="sm" variant="outline" className="flex-1 h-8 font-bold text-xs gap-1 border-accent/30 text-accent" disabled>
                <Check className="h-3 w-3" /> You've Joined
              </Button>
            )}
            {isUnlocked && (
              <Button size="sm" className="flex-1 h-8 font-bold text-xs gap-1 bg-accent hover:bg-accent/90">
                <ExternalLink className="h-3 w-3" /> Get Deal
              </Button>
            )}
            {isExpired && !isUnlocked && (
              <Button size="sm" variant="outline" className="flex-1 h-8 font-bold text-xs text-muted-foreground" disabled>
                Expired
              </Button>
            )}

            {/* Share */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 gap-1 text-xs border-border"
              onClick={handleShare}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-border"
              onClick={shareToTwitter}
              title="Share on X"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-border"
              onClick={shareToWhatsApp}
              title="Share on WhatsApp"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
