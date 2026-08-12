
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_from text;

INSERT INTO public.email_templates(chave,nome,assunto,html,texto,variaveis) VALUES
('licenca_bloqueada','Licença bloqueada',
 'Sua licença foi bloqueada',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Licença bloqueada ⛔</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> foi temporariamente bloqueada. Se acredita ser um engano, fale com o suporte: <a href="{{link_suporte}}" style="color:#93c5fd">{{link_suporte}}</a>.</p></div></div>',
 'Sua licença {{licenca}} foi bloqueada. Suporte: {{link_suporte}}',
 '["nome","licenca"]'),
('licenca_desbloqueada','Licença desbloqueada',
 'Sua licença foi desbloqueada ✅',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Licença desbloqueada ✅</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> voltou a funcionar normalmente.</p></div></div>',
 'Sua licença {{licenca}} foi desbloqueada.',
 '["nome","licenca"]'),
('recuperacao_senha','Recuperação de senha',
 'Redefina sua senha',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Redefinir senha</h1><p>Olá {{nome}}, recebemos um pedido para redefinir sua senha. Clique no botão abaixo para criar uma nova.</p><p><a href="{{link_reset}}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:linear-gradient(90deg,#7c3aed,#3b82f6);color:#fff;text-decoration:none;font-weight:600">Redefinir senha</a></p><p style="color:#9aa3b2;font-size:12px">Se você não solicitou, ignore este e-mail.</p></div></div>',
 'Redefina sua senha: {{link_reset}}',
 '["nome","link_reset"]'),
('boas_vindas','Boas-vindas',
 'Bem-vindo(a) à MR Sem Limites 🎉',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Bem-vindo(a), {{nome}} 👋</h1><p>Sua conta foi criada com sucesso. Acesse seu painel para começar.</p><p><a href="{{link_portal}}" style="color:#93c5fd">Acessar painel</a></p></div></div>',
 'Bem-vindo, {{nome}}! Acesse: {{link_portal}}',
 '["nome"]')
ON CONFLICT (chave) DO NOTHING;
