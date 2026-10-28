import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Nom affiché dans le message, pour situer la panne. */
  label: string;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Garde-fou local : si un panneau lève une exception pendant le rendu, on affiche
 * un message au lieu de démonter toute l'interface (écran noir).
 */
export default function ErrorBoundary({ children, label, onReset }: Props) {
  class Guard extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
      return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
      console.error(`[Point Zéro] ${this.props.label}`, error, info.componentStack);
    }

    render() {
      if (!this.state.error) return this.props.children;
      return (
        <div className="glass-strong fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-[17px] font-semibold">{this.props.label} s'est interrompu</p>
          <p className="max-w-[440px] text-[13px] leading-relaxed text-label-2">
            {this.state.error.message || "Erreur inconnue."} Vos données ne sont pas perdues :
            la sauvegarde automatique reste en place.
          </p>
          <div className="flex gap-2">
            {this.props.onReset && (
              <button type="button" className="btn-tinted" onClick={this.props.onReset}>
                Réessayer
              </button>
            )}
            <button
              type="button"
              className="btn-quiet"
              onClick={() => this.setState({ error: null })}
            >
              Fermer le panneau
            </button>
          </div>
        </div>
      );
    }
  }
  return <Guard {...{ children, label, onReset }} />;
}
