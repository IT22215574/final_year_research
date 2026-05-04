// mobile/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
    
    // Log the error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    };
    
    console.error("Error details:", errorDetails);
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReportError = () => {
    const errorMessage = this.state.error?.message || "Unknown error occurred";
    Alert.alert(
      "Error Report",
      `Error: ${errorMessage}\n\nPlease contact support if this continues.`,
      [{ text: "OK" }]
    );
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View className="flex-1 justify-center items-center bg-slate-50 p-6">
          <View className="bg-red-50 rounded-xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <Ionicons name="warning" size={48} color="#ef4444" />
              <Text className="text-xl font-bold text-red-700 mt-2">
                Oops! Something went wrong
              </Text>
            </View>
            
            <Text className="text-red-600 text-center mb-6">
              The app encountered an unexpected error. Don't worry, your data is safe.
            </Text>
            
            <View className="gap-3">
              <TouchableOpacity
                onPress={this.handleRestart}
                className="bg-red-600 rounded-xl py-3 px-4"
              >
                <Text className="text-white font-semibold text-center">
                  Try Again
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={this.handleReportError}
                className="bg-slate-200 rounded-xl py-3 px-4"
              >
                <Text className="text-slate-700 font-semibold text-center">
                  Report Error
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;