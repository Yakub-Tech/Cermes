# Cermes

**Sales, kitchen preparation and pickup for community events. Runs locally in a browser, without internet during operation.**

[Deutsch](README.md) · [Operating guide, German](ANLEITUNG.md) · [License](LICENSE)

Cermes connects the checkout, kitchen, pickup station and customer displays on a local
network. Each sold portion receives its own pickup number. The kitchen marks it ready,
the pickup station confirms collection, and a TV displays the current status.
One laptop running Docker acts as the server; the other devices only need a browser.

## Used in practice

The project was created for recurring community association sales and is used regularly.
A single checkout handles approximately **€10,000 in revenue per sales weekend**.
This describes actual use, not a load test or a performance guarantee.

Developed by **Yakub Uyar**. The source code documents the implementation and
its limitations.

## Screenshots

These three screenshots show the German interface with fictional sample data
and illustrative product images.
They contain no real sales data, association logos or advertising content.

### Checkout

Products, extras, special requests and the shopping cart in one view.

![German checkout interface with products and a populated cart](assets/screenshots/kasse.png)

### TV display

Pickup numbers are grouped into “In preparation” and “Ready for pickup”.
During operation, the headings automatically alternate between German and Turkish.

![TV display with German headings and colour-coded pickup numbers](assets/screenshots/tv.png)

### Statistics

Units sold, revenue, calculated profit, and breakdowns by product and hour.

![German statistics interface with sample totals and charts](assets/screenshots/statistik.png)

## Features

- Checkout with extras, special requests, parked carts and cancellations
- Separate number sequences and configurable number blocks per product
- Dedicated kitchen and pickup views with live updates
- TV display, advertising carousel and a checkout customer display
- Statistics for individual days and date ranges, Excel and PDF export
- Product, extras, image, user and settings management
- Server-enforced roles and an audit log
- ZIP backup download and validated restore
- German and Turkish interfaces, dark and light themes
- Multiple checkouts with individual customer displays; the real deployment
  described above uses one checkout

## Technology and decisions

| Area | Implementation and reason |
| --- | --- |
| Interface | React, Vite and Tailwind CSS; devices use a browser without installing an app. |
| Server | Node.js 22 and Express; the API and built frontend run together. |
| Database | SQLite with WAL and a busy timeout; no separate database server. |
| Live updates | WebSocket events trigger data reloads in the affected views. |
| Money | Integer cents instead of floating-point values for prices and totals. |
| Sales | Number allocation and the sale are saved in one transaction. |
| History | Names, prices and costs are frozen at sale time; later product edits do not change past sales. Cancellation changes status instead of deleting the record. |
| Permissions | Roles are checked by the server; hiding a button is not access control. |
| Operation | One Docker container, port 8080 and one data directory; fonts and libraries are served locally. |

The application is intended for a trusted local network. The server must remain
reachable: operating without internet does not mean devices can record sales without
a connection to the server. Cermes records sales; it does not process card payments
or print receipts. A public internet demo is outside its intended operating model.

## Run locally

Requirement: Docker with Docker Compose, for example Docker Desktop.
The initial build needs internet access to download dependencies.

```sh
git clone https://github.com/Yakub-Tech/Cermes.git
cd Cermes
```

1. Copy `.env.beispiel` and name the copy `.env`.
2. Set your own strong password after `CERMES_EINRICHTUNGSKENNWORT=`.
   Initial setup remains locked without this password.
3. Start the application:

   ```sh
   docker compose up -d --build
   ```

4. Open `http://localhost:8080` and use the setup password to create the first admin
   account. Other devices connect to the server laptop's local address on the same
   network.

On Windows, `Cermes-Starten.bat` and `Cermes-Beenden.bat` assist with daily operation.
See the [German operating guide](ANLEITUNG.md) for details.

```sh
docker compose down     # Stop; saved data is preserved
docker compose up -d    # Start the existing image without rebuilding
```

The application creates its database, images and session secret in `data/`.
This directory and the `.env` file do not belong in the repository. The published
project contains neither configured accounts nor a populated sales database.

## Development and checks

Requirement: Node.js 22. Dependencies are installed from the lockfiles.

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run pruefe-offline
```

For development, use two terminals:

```sh
npm --prefix backend start
npm --prefix frontend run dev
```

The backend runs on port 8080 and Vite on port 5173. Vite proxies API requests to the
backend. Automated tests cover number allocation, checkout, cancellations, statistics,
authentication, backups and interrupted connections, among other areas. GitHub Actions
runs the tests, build and offline check. The offline check searches the built frontend
for external addresses.

## Project structure

```text
backend/src/       Express API, business logic and SQLite migrations
backend/test/      Backend and API tests
frontend/src/      React views, components and helpers
frontend/test/     Frontend logic and interface rule tests
frontend/scripts/ Offline check
assets/           Neutral default logo and screenshots
data/             Local runtime data, excluded from Git
```

## License and use at your own risk

Copyright © 2026 **Yakub Uyar**. The publicly viewable source code is provided under
[custom license terms](LICENSE), in German and English.

**Viewing, using and adapting Cermes free of charge is permitted.** Associations and
businesses may use Cermes as a checkout system to record sales of their goods.
**Selling Cermes or versions based on it, or offering them for a fee, is prohibited
without express permission from Yakub Uyar.** Paid access, paid software services
and corresponding inclusion in other software offerings are also prohibited.
Free distribution is permitted with source code, license and copyright notices.
Third-party libraries retain their own licenses. Cermes is therefore not open-source
software under the usual definition. The full terms are in [LICENSE](LICENSE).

**Use at your own risk.** Cermes is provided free of charge, as is, without warranty,
any commitment to provide support, or any maintenance obligation, to the extent
permitted by law. Before production use, operators must review the code and
application for suitability, correct operation, security, data protection, and the
legal requirements applicable to their intended use. Operators are responsible
for operation, access permissions and backups. No suitability or legal compliance
for a particular purpose is warranted. To the extent permitted by law, no liability
is accepted for damage arising from use or inability to use the software.
Liability imposed by mandatory law remains unaffected.
