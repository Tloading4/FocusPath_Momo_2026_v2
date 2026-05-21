import { FocusAIChat } from './FocusAIChat';

interface FocusAIScreenProps {
  refreshTrigger?: number;
  onNavigate?: (tabId: string) => void;
}

export function FocusAIScreen({ refreshTrigger = 0, onNavigate }: FocusAIScreenProps) {
  return <FocusAIChat refreshTrigger={refreshTrigger} onNavigate={onNavigate} />;
}
