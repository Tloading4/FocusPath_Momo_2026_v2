import React, { createContext, useContext } from 'react';

// Define the interface for all data operations
export interface IDataSource {
  // User and Profile
  fetchUserData(): Promise<any>;
  updateUserData(data: any): Promise<any>;
  updateUserProfile(profileData: any): Promise<any>;

  // Sessions
  startFocusSession(sessionData: any): Promise<any>;
  endFocusSession(): Promise<any>;
  logDistraction(data: any): Promise<any>;
  fetchSessionsHistory(): Promise<any>;

  // Streaks
  fetchStreaksData(): Promise<any>;

  // Marketplace
  fetchMarketplaceData(): Promise<any>;
  performPurchase(item: any): Promise<any>;
  equipPurchasedItem(itemId: string, category: string): Promise<any>;
  activatePowerUp(powerUpId: string): Promise<any>;

  // Leaderboard (if implemented)
  fetchLeaderboardData?(): Promise<any>;

  // Challenges (if implemented)
  fetchChallengesData?(): Promise<any>;
  claimChallengeReward?(challengeId: string): Promise<any>;

  // Extension-specific (for communication)
  onExtensionMessage?(callback: (message: any) => void): () => void;
  syncSessionData?(sessionData: any): Promise<any>;
  syncUserProfile?(profileData: any): Promise<any>;
}

// Create the context
export const DataSourceContext = createContext<IDataSource | undefined>(undefined);

// Custom hook to use the data source
export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}

// Props for the DataSourceProvider
interface DataSourceProviderProps {
  children: React.ReactNode;
  dataSource: IDataSource;
}

// Provider component
export function DataSourceProvider({ children, dataSource }: DataSourceProviderProps) {
  return (
    <DataSourceContext.Provider value={dataSource}>
      {children}
    </DataSourceContext.Provider>
  );
}