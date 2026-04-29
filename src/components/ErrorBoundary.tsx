import { Component, type ErrorInfo, type ReactNode } from "react";
import { Frown } from "lucide-react";
import { captureReactError } from "@/lib/monitoring";
import i18n from "@/i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary : attrape les erreurs JavaScript dans l'arbre des composants enfants,
 * affiche un fallback au lieu d'un écran blanc.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary a capturé une erreur :", error, errorInfo);
    captureReactError(error, errorInfo.componentStack ?? "");
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <main className="min-h-screen flex items-center justify-center bg-background px-4" role="alert" aria-live="assertive">
          <section className="max-w-md w-full text-center space-y-4">
            <Frown className="mx-auto h-16 w-16 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-2xl font-semibold">{i18n.t("errorBoundary.title", "Oups, une erreur est survenue")}</h1>
            <p className="text-muted-foreground text-sm">
              {i18n.t("errorBoundary.description", "Nous sommes désolés pour la gêne occasionnée. Vous pouvez réessayer ou revenir à l'accueil.")}
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
                type="button"
              >
                {i18n.t("errorBoundary.retry", "Réessayer")}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 rounded-md border border-border hover:bg-muted transition"
                type="button"
              >
                {i18n.t("errorBoundary.backToHome", "Retour à l'accueil")}
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
