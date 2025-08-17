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
    return Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'OK',
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl',
        title: 'text-gray-900',
        content: 'text-gray-700'
      }
    });
  },
  
  error: (title, text) => {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK',
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#ef4444',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl',
        title: 'text-gray-900',
        content: 'text-gray-700'
      }
    });
  },
  
  warning: (title, text) => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'OK',
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#f59e0b',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl',
        title: 'text-gray-900',
        content: 'text-gray-700'
      }
    });
  },
  
  confirm: (title, text, confirmText = 'Yes', cancelText = 'Cancel') => {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl',
        title: 'text-gray-900',
        content: 'text-gray-700'
      }
    });
  },
  
  loading: (title = 'Loading...', text = 'Please wait...') => {
    return Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      customClass: {
        popup: 'backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl',
        title: 'text-gray-900',
        content: 'text-gray-700'
      },
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
};

