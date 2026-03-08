import { useState } from "react";
import { Settings, Zap, ZapOff, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAutoTrade } from "@/hooks/useAutoTrade";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/sonner";

export const AutoTradeSettings = () => {
  const { settings, loading, createSettings, updateSettings } = useAutoTrade();
  const { wallet } = useWallet();
  const [open, setOpen] = useState(false);

  const handleEnable = async () => {
    if (!settings) {
      await createSettings();
      toast.success("Auto-trade ayarları oluşturuldu!");
      return;
    }
    await updateSettings({ is_enabled: !settings.is_enabled });
    toast.success(settings.is_enabled ? "Auto-trade devre dışı" : "Auto-trade aktif!");
  };

  const handleUpdate = async (field: string, value: any) => {
    if (!settings) return;
    await updateSettings({ [field]: value });
  };

  return (
    <>
      {/* Compact Status Bar */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {settings?.is_enabled ? (
            <Zap className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
          ) : (
            <ZapOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground">
            Auto-Trade
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
            settings?.is_enabled
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {settings?.is_enabled ? 'AKTİF' : 'KAPALI'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {settings?.is_enabled && (
            <span className="text-[9px] text-muted-foreground font-mono">
              {settings.daily_sol_used.toFixed(2)}/{settings.max_daily_sol} SOL
            </span>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm font-display flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Auto-Trade Ayarları
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Auto-Trade</div>
                    <div className="text-[10px] text-muted-foreground">Bot sinyallere göre otomatik al/sat yapar</div>
                  </div>
                  <Switch
                    checked={settings?.is_enabled || false}
                    onCheckedChange={handleEnable}
                    disabled={!wallet}
                  />
                </div>
                {!wallet && (
                  <p className="text-[10px] text-destructive">Önce cüzdan oluştur!</p>
                )}

                {settings && (
                  <>
                    {/* Buy/Sell Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-secondary/50 border border-border p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-[hsl(var(--chart-up))]" />
                            <span className="text-[10px] font-mono">AUTO BUY</span>
                          </div>
                          <Switch
                            checked={settings.auto_buy_enabled}
                            onCheckedChange={(v) => handleUpdate('auto_buy_enabled', v)}
                          />
                        </div>
                        <div className="text-[9px] text-muted-foreground">Min güven: %{settings.min_confidence_buy}</div>
                      </div>
                      <div className="rounded-lg bg-secondary/50 border border-border p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-[hsl(var(--chart-down))]" />
                            <span className="text-[10px] font-mono">AUTO SELL</span>
                          </div>
                          <Switch
                            checked={settings.auto_sell_enabled}
                            onCheckedChange={(v) => handleUpdate('auto_sell_enabled', v)}
                          />
                        </div>
                        <div className="text-[9px] text-muted-foreground">Min güven: %{settings.min_confidence_sell}</div>
                      </div>
                    </div>

                    {/* Settings Grid */}
                    <div className="space-y-2">
                      <SettingRow
                        label="Trade başına max SOL"
                        value={settings.max_sol_per_trade}
                        onChange={(v) => handleUpdate('max_sol_per_trade', v)}
                        step={0.01}
                        min={0.005}
                        max={10}
                      />
                      <SettingRow
                        label="Günlük max SOL"
                        value={settings.max_daily_sol}
                        onChange={(v) => handleUpdate('max_daily_sol', v)}
                        step={0.1}
                        min={0.1}
                        max={50}
                      />
                      <SettingRow
                        label="Min buy güven %"
                        value={settings.min_confidence_buy}
                        onChange={(v) => handleUpdate('min_confidence_buy', v)}
                        step={5}
                        min={30}
                        max={95}
                      />
                      <SettingRow
                        label="Min sell güven %"
                        value={settings.min_confidence_sell}
                        onChange={(v) => handleUpdate('min_confidence_sell', v)}
                        step={5}
                        min={30}
                        max={95}
                      />
                      <SettingRow
                        label="Max açık pozisyon"
                        value={settings.max_open_positions}
                        onChange={(v) => handleUpdate('max_open_positions', v)}
                        step={1}
                        min={1}
                        max={20}
                      />
                      <SettingRow
                        label="Stop-loss %"
                        value={settings.stop_loss_percent}
                        onChange={(v) => handleUpdate('stop_loss_percent', v)}
                        step={5}
                        min={5}
                        max={50}
                      />
                      <SettingRow
                        label="Take-profit %"
                        value={settings.take_profit_percent}
                        onChange={(v) => handleUpdate('take_profit_percent', v)}
                        step={5}
                        min={10}
                        max={500}
                      />
                    </div>

                    {/* Safety Info */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Güvenlik</span>
                      </div>
                      <ul className="text-[9px] text-muted-foreground space-y-0.5">
                        <li>• Günlük {settings.max_daily_sol} SOL limit ({settings.daily_sol_used.toFixed(2)} kullanıldı)</li>
                        <li>• Trade başına max {settings.max_sol_per_trade} SOL</li>
                        <li>• Bakiyenin %90'ından fazlası kullanılmaz</li>
                        <li>• Her 5 dakikada sinyal taraması</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

const SettingRow = ({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <Input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
      className="w-20 h-6 text-[10px] text-right bg-secondary border-border font-mono"
      step={step}
      min={min}
      max={max}
    />
  </div>
);
