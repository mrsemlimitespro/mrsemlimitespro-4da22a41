# NativeService — camada única de acesso a recursos nativos

Toda funcionalidade nativa (Push, Biometria, Câmera, GPS, Compartilhamento,
Armazenamento seguro, etc.) é acessada através de **um único ponto**:

```ts
import { NativeService } from "@/native/NativeService";
```

Nenhum componente, hook, route ou server function importa plugins do
Capacitor diretamente. Trocar de plugin nunca deve tocar em telas.

## Contrato uniforme

Toda função retorna `NativeResult<T>` — nunca `throw`:

```ts
type NativeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: NativeErrorCode; message: string; cause?: unknown } };
```

Códigos de erro padronizados:
`unsupported | not_implemented | permission_denied | cancelled | not_available | unknown`.

Uso típico:

```ts
const r = await NativeService.browser.open({ url });
if (!r.ok) toast.error(r.error.message);
```

## Compatibilidade por serviço

| Serviço            | Android | iOS | Web/PWA         | Plugin (fase futura)                |
| ------------------ | :-----: | :-: | :-------------: | ----------------------------------- |
| `browser`          |   ✅    | ✅  | ✅ window.open  | @capacitor/browser (instalado)      |
| `network`          |   ✅    | ✅  | ✅ navigator    | @capacitor/network (instalado)      |
| `storage`          |   ✅    | ✅  | ✅ localStorage | @capacitor/preferences (instalado)  |
| `share`            |   🔜    | 🔜  | ✅ Web Share    | @capacitor/share                    |
| `clipboard`        |   🔜    | 🔜  | ✅ Clipboard    | @capacitor/clipboard                |
| `haptics`          |   🔜    | 🔜  | ✅ vibrate      | @capacitor/haptics                  |
| `device`           |   🔜    | 🔜  | ✅ userAgent    | @capacitor/device                   |
| `push`             |   🔜    | 🔜  | ❌              | @capacitor/push-notifications + FCM |
| `biometric`        |   🔜    | 🔜  | ❌              | @capacitor-community/biometric-auth |
| `camera`           |   🔜    | 🔜  | ⚠️ getUserMedia | @capacitor/camera                   |
| `microphone`       |   🔜    | 🔜  | ⚠️ MediaRecorder| capacitor-voice-recorder            |
| `geolocation`      |   🔜    | 🔜  | ⚠️              | @capacitor/geolocation              |
| `files`            |   🔜    | 🔜  | ❌              | @capacitor/filesystem               |
| `deepLinks`        |   🔜    | 🔜  | (URL nativa)    | @capacitor/app                      |
| `permissions`      |   🔜    | 🔜  | ✅ Permissions  | delegado a cada plugin              |

Legenda: ✅ já funciona · 🔜 contrato pronto, implementação futura · ⚠️ web parcial

## Como adicionar um novo recurso

1. Criar `src/native/XyzService.ts` com o mesmo contrato (`NativeResult`).
2. Registrar em `NativeService.ts`.
3. Instalar o plugin do Capacitor apenas dentro do próprio `XyzService`, via
   `await import("@capacitor/xyz")` no método (lazy) — o web bundle não paga o custo.
4. Fornecer fallback web/PWA (Web API equivalente ou `notImplemented(...)`).
5. Atualizar tabela de compatibilidade acima.

## Regras invioláveis

- ❌ Nunca `import { Foo } from "@capacitor/foo"` fora de `src/native/`.
- ❌ Nunca `throw` — sempre retornar `NativeResult`.
- ❌ Nunca depender de plataforma na tela (`if (isAndroid()) ...`); o serviço
  já resolve isso internamente.
- ✅ Sempre usar `await import()` para os plugins nativos (mantém SSR e
  bundle web enxutos).
