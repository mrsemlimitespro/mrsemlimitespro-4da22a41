import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
        confirmPassword: z.string().min(8),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "As senhas não conferem",
        path: ["confirmPassword"],
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // Nota: O client SDK do Supabase auth.updateUser() deve ser chamado no client
    // para usar o token da sessão atual. Esta server function serve apenas para
    // validações adicionais se necessário, mas a troca real de senha 
    // no Supabase Auth usando o SDK atual é melhor feita no client side 
    // após validação, ou via Admin API no server.
    
    // Para facilitar e manter a segurança da sessão, vamos retornar sucesso
    // para o componente client prosseguir com supabase.auth.updateUser.
    return { ok: true };
  });
