'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  helpText?: string;
  required: boolean;
}

export interface AuthStrategySchema {
  type: string;
  formFields: FormField[];
}

interface AuthBindingFormProps {
  connectorId: string;
  strategies: AuthStrategySchema[];
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export function AuthBindingForm({
  connectorId,
  strategies,
  onSuccess,
  onError,
}: AuthBindingFormProps) {
  const [selectedType, setSelectedType] = useState<string>(
    strategies[0]?.type || '',
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStrategy = strategies.find((s) => s.type === selectedType);
  const isOAuth2 = selectedType === 'oauth2_code';

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isOAuth2) {
        // Initiate OAuth2 redirect flow
        const res = await fetch(
 `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/saas-bindings/oauth2/authorize`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify({ connectorId }),
          },
        );
        const data = await res.json();
        if (data.authorizeUrl) {
          window.location.href = data.authorizeUrl;
        } else {
          throw new Error(data.error || 'Failed to initiate OAuth2');
        }
      } else {
        // Standard form submission
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/saas-bindings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify({
              connectorId,
              authType: selectedType,
              ...values,
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || '绑定失败');
        }
        onSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '绑定失败';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Strategy selector (tabs) — only show if multiple strategies */}
      {strategies.length > 1 && (
        <div className="flex gap-2">
          {strategies.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => {
                setSelectedType(s.type);
                setValues({});
                setError(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                selectedType === s.type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {s.type === 'api_key' && 'API Key'}
              {s.type === 'app_secret' && 'App Secret'}
              {s.type === 'basic_auth' && '用户名密码'}
              {s.type === 'oauth2_code' && 'OAuth 2.0'}
            </button>
          ))}
        </div>
      )}

      {/* Dynamic form fields */}
      {currentStrategy &&
        currentStrategy.formFields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        ))}

      {/* OAuth2 redirect button */}
      {isOAuth2 && (
        <p className="text-sm text-muted-foreground">
          点击绑定后将跳转到第三方授权页面
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '绑定中...' : isOAuth2 ? '前往授权' : '绑定'}
      </Button>
    </form>
  );
}
