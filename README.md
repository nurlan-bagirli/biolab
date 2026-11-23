# HUMAN BioLab

A browser-based biosignal exploration lab built with React, Vite and Supabase.

## Current stage

- Live simulated EEG, EMG, EOG, PPG and GSR traces.
- Dashboard, live monitor, experiment presets and signal analysis views.
- Supabase project schema prepared for authenticated experiments, devices and signal samples.
- Simulation is explicitly labelled; it is not a physiological measurement.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public publishable key is intended for browser use. Never place a Supabase secret/service_role key in this repository.

## Deploy

GitHub Actions builds and deploys the `main` branch to GitHub Pages. In repository Settings → Pages, select **GitHub Actions** as the build and deployment source.

## Safety

This is an educational/experimental visualization platform, not a medical device. Do not use it for diagnosis or treatment decisions. Do not connect a person to DIY electronics that are mains-powered or connected to a non-isolated USB supply.