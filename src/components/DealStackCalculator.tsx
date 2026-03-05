import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Tag, Percent, DollarSign, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface DealStackCalculatorProps {
  dealDiscount: string;
  dealDiscountType: string;
  storeName: string;
}

function parseDiscountPercent(val: string): number {
  const m = val.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

export function DealStackCalculator({ dealDiscount, dealDiscountType, storeName }: DealStackCalculatorProps) {
  const [promoCode, setPromoCode] = useState("");
  const [promoPercent, setPromoPercent] = useState(0);
  const [cashbackPercent, setCashbackPercent] = useState(5);
  const [originalPrice, setOriginalPrice] = useState(100);

  const studentDiscountPct = parseDiscountPercent(dealDiscount);

  // Calculate stacked savings
  const afterStudentDiscount = originalPrice * (1 - studentDiscountPct / 100);
  const afterPromo = afterStudentDiscount * (1 - promoPercent / 100);
  const cashbackAmount = afterPromo * (cashbackPercent / 100);
  const finalPrice = afterPromo - cashbackAmount;
  const totalSaved = originalPrice - finalPrice;
  const totalSavedPct = originalPrice > 0 ? Math.round((totalSaved / originalPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-primary/20 bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-gold" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                CampusPerk Stack™
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold">PREMIUM</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                Stack discounts to maximize your savings at {storeName}
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Original Price */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Original Price ($)</Label>
            <Input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)}
              className="h-9 bg-secondary border-border text-sm"
            />
          </div>

          {/* Savings breakdown */}
          <div className="space-y-2">
            {/* Student Discount */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-xs font-medium text-foreground">Student Discount</p>
                  <p className="text-[10px] text-muted-foreground">Via CampusPerk</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-accent">{studentDiscountPct}% off</p>
                <p className="text-[10px] text-muted-foreground">-${(originalPrice * studentDiscountPct / 100).toFixed(2)}</p>
              </div>
            </div>

            {/* Promo Code */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Promo Code</p>
                  <Input
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="h-6 w-24 text-[10px] mt-0.5 bg-transparent border-border/50 px-1.5"
                  />
                </div>
              </div>
              <div className="text-right">
                <Input
                  type="number"
                  value={promoPercent}
                  onChange={(e) => setPromoPercent(Math.min(100, Number(e.target.value) || 0))}
                  className="h-7 w-16 text-xs bg-transparent border-border/50 text-right"
                  placeholder="0%"
                />
                <p className="text-[10px] text-muted-foreground">-${(afterStudentDiscount * promoPercent / 100).toFixed(2)}</p>
              </div>
            </div>

            {/* Cashback */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gold/5 border border-gold/10">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gold" />
                <div>
                  <p className="text-xs font-medium text-foreground">Cashback Estimate</p>
                  <p className="text-[10px] text-muted-foreground">Rakuten, Honey, etc.</p>
                </div>
              </div>
              <div className="text-right">
                <Input
                  type="number"
                  value={cashbackPercent}
                  onChange={(e) => setCashbackPercent(Math.min(100, Number(e.target.value) || 0))}
                  className="h-7 w-16 text-xs bg-transparent border-border/50 text-right"
                  placeholder="5%"
                />
                <p className="text-[10px] text-muted-foreground">+${cashbackAmount.toFixed(2)} back</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Total Savings Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 via-primary/5 to-gold/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Total Possible Savings</p>
                  <p className="text-[10px] text-muted-foreground">All discounts stacked</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-black text-accent">
                  ${totalSaved.toFixed(2)}
                </p>
                <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-bold">
                  {totalSavedPct}% total savings
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent/10">
              <span className="text-xs text-muted-foreground">You pay</span>
              <span className="font-display text-lg font-bold text-foreground">${finalPrice.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Savings are estimates. Actual amounts may vary based on merchant terms.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
