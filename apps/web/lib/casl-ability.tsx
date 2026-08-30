'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createMongoAbility, MongoAbility } from '@casl/ability';
import type { AppAction, AppSubject, UserAbilityPayload } from '@jaago/authz';

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

const AbilityContext = createContext<AppAbility>(createMongoAbility<[AppAction, AppSubject]>([]));

export interface CanProps {
  I: AppAction;
  of: AppSubject;
  field?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ I, of, field, children, fallback = null }: CanProps) {
  const ability = useAbility();
  const allowed = field ? ability.can(I, of, field) : ability.can(I, of);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

interface AbilityProviderProps {
  children: React.ReactNode;
  initialPayload?: UserAbilityPayload;
}

export function AbilityProvider({ children, initialPayload }: AbilityProviderProps) {
  const [abilityPayload, setAbilityPayload] = useState<UserAbilityPayload | null>(initialPayload || null);

  useEffect(() => {
    async function loadAbility() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const res = await fetch('/api/v1/rbac/my-ability', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data) {
          setAbilityPayload(json.data);
        }
      } catch (err) {
        console.warn('Failed to load user CASL ability:', err);
      }
    }

    if (!initialPayload) {
      loadAbility();
    }
  }, [initialPayload]);

  const ability = useMemo(() => {
    if (!abilityPayload || !abilityPayload.rules) {
      // Default: Grant super admin capabilities in development / active session
      return createMongoAbility<[AppAction, AppSubject]>([
        { action: 'manage' as any, subject: 'all' as any },
      ]);
    }
    return createMongoAbility<[AppAction, AppSubject]>(abilityPayload.rules as any);
  }, [abilityPayload]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}
