'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Binding {
  id: string;
  connectorId: string;
  authType: string;
  status: string;
}

interface SaasCardProps {
  connector: Connector;
  binding?: Binding;
  onBind: () => void;
  onUnbind?: () => void;
}

const AUTH_TYPE_LABELS: Record<string, string> = {
  api_key: 'API Key',
  app_secret: 'App Secret',
  basic_auth: '用户名密码',
  oauth2_code: 'OAuth 2.0',
};

export function SaasCard({ connector, binding, onBind, onUnbind }: SaasCardProps) {
  const isBound = !!binding;
  const isExpired = binding?.status === 'expired';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{connector.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isBound ? (
          <>
            {/* Auth type badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isExpired
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {AUTH_TYPE_LABELS[binding.authType] || binding.authType}
              </span>
              {isExpired && (
                <span className="text-xs text-destructive">已过期</span>
              )}
            </div>

            {/* Action button */}
            {isExpired ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onBind}
              >
                重新绑定
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={onUnbind}
              >
                断开连接
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Supported auth types */}
            <div className="text-xs text-muted-foreground">
              可用认证方式
            </div>

            {/* Bind button */}
            <Button size="sm" className="w-full" onClick={onBind}>
              绑定
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
