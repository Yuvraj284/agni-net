# AgniNet — demo script

A five-minute walkthrough for judges or reviewers. Everything below works on the built-in sample data; step 7
is optional and needs a NASA FIRMS key.

**Before you start:** `npm install && npm run dev`, open http://127.0.0.1:5173, and click **Reset demo data**
(bottom of the sidebar) so the sample timestamps are fresh. Use a wide browser window.

| # | Time | Do | Say |
| --- | --- | --- | --- |
| 1 | 0:00 | Open **Overview**. | "Satellites detect thousands of thermal hotspots. Most are not wildfires. AgniNet turns them into a short, prioritised review queue." Point at the summary strip: high-priority alerts awaiting review, verified incidents, reviewed-not-confirmed. |
| 2 | 0:40 | Point at the map. | "Hotspots are grouped into candidate alerts. The map shows India's boundary as officially depicted, including PoK and Aksai Chin." |
| 3 | 1:00 | Click **ALT-OD-001** in the review queue. | "Every alert explains itself." Show the location and timing, then the **priority score**: four factors (confidence, recency, recurrence across satellite passes, proximity to a tiger reserve), each with its rule. "It orders human review. It is not the probability of a fire." |
| 4 | 1:45 | Scroll to **Weather and spread estimate**. | "Current weather from Open-Meteo, and a rough downwind envelope for 3 and 6 hours. It is labelled illustrative because it is not a fire-behaviour model." |
| 5 | 2:15 | In **Verification**: pick a reviewer, choose **Confirmed**, tick *Requested field verification*, write a short note, **Save review**. | "Reviews are an append-only log. Nothing is overwritten." Show the new entries in **Review history**, then the queue and map marker updating. Reload the page: it is still there. |
| 6 | 3:00 | Click **Share with a field team via WhatsApp**. | "One tap prepares a message for a range officer: priority, coordinates, a map link, current weather and a request to verify. It is marked as demo data, and we only record that it was opened, not that it was delivered." Close with Esc. |
| 7 | 3:40 | *(Optional, needs a key.)* Click **Sample data** in the top bar → **NASA FIRMS, last 24 hours**. | "The same pipeline on real near-real-time VIIRS and MODIS detections. The key stays on the server." Without a key the app says so and stays on sample data. |
| 8 | 4:15 | Open **Alerts** → **Export as CSV**; click the link icon in an alert's header. | "Hand-offs: a CSV for the control room, and a link that opens straight to the alert." |
| 9 | 4:40 | Toggle the theme (moon icon). | "Light and dark for day shifts and night shifts." |

## Talking points if asked

- **Is this live?** Sample data by default; real FIRMS data with a key (step 7). Weather is always current.
- **How is the boundary handled?** OpenStreetMap shows boundaries as controlled on the ground, so AgniNet hides
  those lines and draws India's official boundary from Natural Earth's India-view dataset. Tests check that
  PoK, Aksai Chin and Shaksgam are inside it.
- **What is not done yet?** Deployment, sign-in and shared multi-user history, calibrated scoring weights,
  official asset boundaries, and delivery tracking for WhatsApp messages. See
  [ARCHITECTURE.md](ARCHITECTURE.md#known-limitations).
