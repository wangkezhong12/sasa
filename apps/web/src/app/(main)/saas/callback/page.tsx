'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function CallbackContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>
            {error ? '绑定失败' : '绑定成功'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {error ? (
            <p className="text-sm text-destructive">
              {error === 'missing_params' && '缺少授权参数'}
              {error === 'invalid_state' && '授权状态已过期，请重试'}
              {error === 'token_exchange_failed' && '令牌交换失败，请重试'}
              {error === 'no_config' && '连接器未配置 OAuth2'}
              {!['missing_params', 'invalid_state', 'token_exchange_failed', 'no_config'].includes(error) && `绑定失败: ${error}`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              SaaS 连接已成功绑定
            </p>
          )}
          <Link href="/saas">
            <Button variant="outline" className="w-full">
              返回 SaaS 管理
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SaasCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>加载中...</p></div>}>
      <CallbackContent />
    </Suspense>
  );
}
