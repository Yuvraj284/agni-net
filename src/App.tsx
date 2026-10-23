import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { AlertDrawer } from './components/alerts/AlertDrawer';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { useApp } from './state/useApp';
import { ActivityView } from './views/ActivityView';
import { AlertsView } from './views/AlertsView';
import { AssetsView } from './views/AssetsView';
import { MapView } from './views/MapView';
import { OverviewView } from './views/OverviewView';

function StorageBanner() {
  const { state, dispatch } = useApp();
  if (!state.storageError) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 border-b border-critical/20 bg-critical/[0.06] px-6 py-2.5 text-13 text-fg">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />
      <span className="flex-1">{state.storageError}</span>
      <button
        type="button"
        onClick={() => dispatch({ type: 'setStorageError', error: null })}
        aria-label="Dismiss"
        className="rounded p-0.5 text-fg-subtle hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastHost() {
  const { state, dispatch } = useApp();
  const t = state.toast;
  if (!t) return null;
  const Icon = t.tone === 'success' ? CircleCheck : t.tone === 'error' ? CircleAlert : Info;
  const tone = t.tone === 'success' ? 'text-success' : t.tone === 'error' ? 'text-critical' : 'text-info';
  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[1300] -translate-x-1/2">
      <div key={t.id} className="flex animate-fade-up items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-13 text-fg shadow-pop">
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
        {t.message}
        <button
          type="button"
          onClick={() => dispatch({ type: 'clearToast', id: t.id })}
          className="ml-1 rounded p-0.5 text-fg-subtle hover:text-fg"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Views that fill the viewport with a map workspace rather than scrolling. */
const WORKSPACE_VIEWS = new Set(['map', 'assets']);

export function App() {
  const { state } = useApp();
  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <StorageBanner />
        <main className={`min-h-0 flex-1 ${WORKSPACE_VIEWS.has(state.view) ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {state.view === 'overview' && <OverviewView />}
          {state.view === 'map' && <MapView />}
          {state.view === 'alerts' && <AlertsView />}
          {state.view === 'assets' && <AssetsView />}
          {state.view === 'activity' && <ActivityView />}
        </main>
      </div>
      <AlertDrawer />
      <ToastHost />
    </div>
  );
}
