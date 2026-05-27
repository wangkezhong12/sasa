'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SaasCard } from '@/components/saas/saas-card';
import { AuthBindingForm, type AuthStrategySchema } from '@/components/saas/auth-binding-form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Binding {
  id: string;
  connectorId: string;
  authType: string;
  status: string;
}

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function SaasPage() {
  const searchParams = useSearchParams();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [bindingConnector, setBindingConnector] = useState<string | null>(null);
  const [authSchemas, setAuthSchemas] = useState<AuthStrategySchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params for OAuth2 callback messages
    const bound = searchParams.get('bound');
    const expired = searchParams.get('expired');
    if (bound) {
      setToast(`${bound} 绑定成功`);
    } else if (expired) {
      setToast(`绑定已过期，请重新绑定`);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const [connRes, bindRes] = await Promise.all([
        fetch(`${API_URL}/connectors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/saas-bindings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setConnectors(Array.isArray(data) ? data : []);
      }
      if (bindRes.ok) {
        const data = await bindRes.json();
        setBindings(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function openBindingDialog(connectorId: string) {
    const token = localStorage.getItem('token') || '';
    try {
      const res = await fetch(`${API_URL}/connectors/${connectorId}/auth-schema`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuthSchemas(data.strategies || []);
        setBindingConnector(connectorId);
      }
    } catch {
      // Silently fail
    }
  }

  function handleBindingSuccess() {
    setBindingConnector(null);
    setToast('绑定成功');
    loadData();
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUnbind(bindingId: string) {
    const token = localStorage.getItem('token') || '';
    await fetch(`${API_URL}/saas-bindings/${bindingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SaaS 管理</h1>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Binding dialog */}
      {bindingConnector && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">绑定连接器</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBindingConnector(null)}
              >
                关闭
              </Button>
            </div>
            <AuthBindingForm
              connectorId={bindingConnector}
              strategies={authSchemas}
              onSuccess={handleBindingSuccess}
            />
          </div>
        </div>
      )}

      {/* Connector grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((connector) => {
          const binding = bindings.find((b) => b.connectorId === connector.id);
          return (
            <SaasCard
              key={connector.id}
              connector={connector}
              binding={binding}
              onBind={() => openBindingDialog(connector.id)}
              onUnbind={binding ? () => handleUnbind(binding.id) : undefined}
            />
          );
        })}
      </div>

      {connectors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          暂无可用的 SaaS 连接器
        </div>
      )}
    </div>
  );
}
