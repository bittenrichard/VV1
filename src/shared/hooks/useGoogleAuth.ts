// Caminho: /src/shared/hooks/useGoogleAuth.ts

import { useState, useEffect, useCallback } from 'react';

// IMPORTANTE: Esta é a URL que o N8N fornecerá para iniciar a autenticação OAuth2 com o Google.
// Você precisará criar uma credencial "Google OAuth2 API" no N8N e colar a "Authorization URL" aqui.
const GOOGLE_OAUTH_URL = 'https://n8n.focoserv.com.br/rest/oauth2-credential/callback';

export const useGoogleAuth = () => {
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem('google_auth_status');
    if (status === 'connected') {
      setIsGoogleConnected(true);
    }
  }, []);

  const connectGoogleCalendar = useCallback(() => {
    const authWindow = window.open(GOOGLE_OAUTH_URL, '_blank', 'width=500,height=600');
    // Para testar, após autorizar no Google, execute no console:
    // localStorage.setItem('google_auth_status', 'connected');
    // E recarregue a página de configurações.
  }, []);

  const disconnectGoogleCalendar = useCallback(() => {
    localStorage.removeItem('google_auth_status');
    setIsGoogleConnected(false);
  }, []);

  return {
    isGoogleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  };
};