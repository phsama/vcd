# apps/mobile — App Flutter

**Status: aguardando Flutter SDK na máquina de desenvolvimento.**

O scaffold Flutter será gerado com o SDK instalado (Fase 3 do plano):

```bash
flutter create --org br.com.voceconhecedeus --project-name vcd_mobile .
```

Estrutura planejada (ver plano de implementação):
- `lib/core/` — api (client gerado do OpenAPI), auth, audio (just_audio + audio_service), push, storage, analytics
- `lib/features/` — onboarding, reflection, comments, wall, checkins, journal, routine, streak, cards, social, paywall, settings
- `ios/` — extensão WidgetKit (Swift) · `android/` — Glance widget (Kotlin)
- `l10n/` — pt-BR + en

Pacotes-chave: `just_audio`, `audio_service`, `home_widget`, `go_router`, `flutter_secure_storage`, `firebase_messaging`, `purchases_flutter` (RevenueCat), `sign_in_with_apple`, `google_sign_in`.
