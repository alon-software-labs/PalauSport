import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'muted';
  className?: string;
}

export function StatsCard({ title, value, description, icon, variant = 'default', className }: StatsCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        variant === 'primary' && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">{title}</CardTitle>
        {icon && (
          <div className={cn(
            'rounded-lg p-2',
            variant === 'primary' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
