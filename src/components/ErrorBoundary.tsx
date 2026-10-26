import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const msg = this.state.errorMessage;
    const isQuotaError = msg.includes('Quota exceeded');
    const isDailyReadQuota = msg.includes('Free daily read units per project');
    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    let displayDetail = msg;
    try {
      const parsed = JSON.parse(msg);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        displayDetail = `${parsed.error} (operation: ${parsed.operationType || 'unknown'}, path: ${parsed.path || 'n/a'})`;
      }
    } catch {
      // Plain error message
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <h1 className="text-lg font-semibold text-slate-900">
              {isQuotaError ? 'Database Quota Reached' : 'Workspace Operation Interrupted'}
            </h1>
          </div>

          {isQuotaError ? (
            <div className="space-y-3 text-sm text-slate-600 mb-6">
              <p>
                Your Firestore free-tier usage quota has been reached and will reset the next day.
                Detailed Spark plan Enterprise edition limits are documented at{' '}
                <a
                  href="https://firebase.google.com/pricing#cloud-firestore"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Firebase Pricing
                </a>
                .
              </p>
              {isDailyReadQuota && (
                <p>
                  To lift daily read unit limits immediately,{' '}
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    open your Firestore upgrade dialog
                  </a>
                  .
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600 mb-6 break-words font-mono bg-slate-50 border border-slate-200 rounded-lg p-3">
              {displayDetail}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Workspace
          </button>
        </div>
      </div>
    );
  }
}
