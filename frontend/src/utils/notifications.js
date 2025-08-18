import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// Toast notifications dengan style yang sesuai dengan glassmorphism theme
export const showToast = {
  success: (message) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },
  
  error: (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },
  
  warning: (message) => {
    toast.warning(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },
  
  info: (message) => {
    toast.info(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
};

// SweetAlert dengan style yang sesuai dengan glassmorphism theme
export const showAlert = {
  success: (title, text) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'OK',
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#10b981',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-2xl shadow-xl',
        title: isDark ? 'text-slate-100' : 'text-gray-900',
        content: isDark ? 'text-slate-300' : 'text-gray-700'
      }
    });
  },
  
  error: (title, text) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK',
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#ef4444',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-2xl shadow-xl',
        title: isDark ? 'text-slate-100' : 'text-gray-900',
        content: isDark ? 'text-slate-300' : 'text-gray-700'
      }
    });
  },
  
  warning: (title, text) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'OK',
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#f59e0b',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-2xl shadow-xl',
        title: isDark ? 'text-slate-100' : 'text-gray-900',
        content: isDark ? 'text-slate-300' : 'text-gray-700'
      }
    });
  },
  
  confirm: (title, text, confirmText = 'Yes', cancelText = 'Cancel') => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-2xl shadow-xl',
        title: isDark ? 'text-slate-100' : 'text-gray-900',
        content: isDark ? 'text-slate-300' : 'text-gray-700'
      }
    });
  },
  
  loading: (title = 'Loading...', text = 'Please wait...') => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-2xl shadow-xl',
        title: isDark ? 'text-slate-100' : 'text-gray-900',
        content: isDark ? 'text-slate-300' : 'text-gray-700'
      },
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
};

