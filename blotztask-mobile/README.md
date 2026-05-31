# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Releases & changelogs

We ship iOS + Android together, built locally via `build.ps1`. Two GitHub Actions
track what's in each release — they build/submit nothing, so there's no risk to the stores.

**Before shipping — see what's coming:** the **"Next release (unreleased)"** draft under the
repo's **Releases** page always lists every PR merged since the last shipped release. It
auto-updates on every merge to `main` (workflow: `preview-next-release.yml`), so the team /
PM can see the impact of a release before it goes out. Bookmark that draft.

**After shipping — record the release:** once you've submitted to both stores, go to the
**Actions** tab → **Tag Release** → **Run workflow**. Optionally fill in the iOS/Android
build numbers (from App Store Connect / Play Console); versions default from `eas.json`.
It creates a `release/<date>` tag and a published Release with auto-generated notes covering
everything since the previous release. That published release becomes the new baseline, so
the "Next release" draft resets to empty.

Both release bodies are editable — polish the auto-generated PR list into user-facing
"what's new" copy when needed.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
