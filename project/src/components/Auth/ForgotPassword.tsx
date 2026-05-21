import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Home } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  onBackToOverview?: () => void;
}

export function ForgotPassword({ onBack, onBackToOverview }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many reset attempts. Please try again later');
      } else {
        setError('Failed to send reset email. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`w-full max-w-md mx-auto transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
        <div className="glass-card rounded-2xl p-8 shadow-2xl hover-lift">
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
              <CheckCircle className="h-8 w-8 text-white animate-bounce-in" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4 animate-slide-down">Check Your Email</h2>
            <p className="text-gray-300 mb-6 leading-relaxed animate-fade-in">
              We've sent a password reset link to <strong className="text-white">{email}</strong>. 
              Click the link in the email to reset your password.
            </p>
            
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mb-6 animate-scale-in">
              <h4 className="font-semibold text-blue-300 mb-2">What's Next?</h4>
              <ul className="text-blue-200 text-sm space-y-1 text-left">
                <li>• Check your email inbox (and spam folder)</li>
                <li>• Click the reset link in the email</li>
                <li>• Create a new password</li>
                <li>• Sign in with your new password</li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={onBack}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] btn-press hover-glow animate-scale-in"
              >
                Back to Sign In
              </button>
              
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                  setError('');
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-semibold transition-all border border-white/20 hover:border-white/30"
              >
                Send Another Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
      <div className="glass-card rounded-2xl p-8 shadow-2xl hover-lift">
        {/* Home Button */}
        {onBackToOverview && (
          <div className="mb-6">
            <button
              onClick={onBackToOverview}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm hover-glow"
            >
              <Home className="h-4 w-4" />
              Back to Overview
            </button>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <Mail className="h-8 w-8 text-white animate-bounce-in" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 animate-slide-down">Reset Password</h2>
          <p className="text-gray-300 animate-fade-in">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm animate-bounce-in flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="animate-slide-right">
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-white/10 focus-ring"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] btn-press hover-glow animate-scale-in"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending Reset Email...
              </span>
            ) : (
              'Send Reset Email'
            )}
          </button>
        </form>

        <div className="mt-6 text-center animate-fade-in">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mx-auto hover-glow"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-white/20 animate-fade-in">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2">Need Help?</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Make sure to check your spam folder</li>
              <li>• The reset link expires in 1 hour</li>
              <li>• Contact support if you don't receive the email</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}