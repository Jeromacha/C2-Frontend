// src/pages/login/index.tsx
import { useEffect, useState } from 'react';
import LoginForm from '@/components/forms/loginForm';

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return (
    <div className="relative h-screen w-screen bg-[#151515] grid place-items-center text-white font-sans overflow-hidden">
      {isMounted && (
        <div className="fixed inset-0 z-0">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMax slice"
            className="absolute top-0 left-0 w-full h-full"
          >
            <defs>
              <path
                id="wave"
                fill="#e0a200"
                d="M-363.852,502.589c0,0,236.988-41.997,505.475,0s371.981,38.998,575.971,0s293.985-39.278,505.474,5.859s493.475,48.368,716.963-4.995v560.106H-363.852V502.589z"
              />
            </defs>
            <g>
              <use xlinkHref="#wave" opacity=".3">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="12s"
                  calcMode="spline"
                  values="270 230; -334 180; 270 230"
                  keyTimes="0; .5; 1"
                  keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0"
                  repeatCount="indefinite"
                />
              </use>
              <use xlinkHref="#wave" opacity=".6">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="8s"
                  calcMode="spline"
                  values="-270 230;243 220;-270 230"
                  keyTimes="0; .6; 1"
                  keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0"
                  repeatCount="indefinite"
                />
              </use>
              <use xlinkHref="#wave" opacity=".9">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  dur="6s"
                  calcMode="spline"
                  values="0 230;-140 200;0 230"
                  keyTimes="0; .4; 1"
                  keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0"
                  repeatCount="indefinite"
                />
              </use>
            </g>
          </svg>
        </div>
      )}

      <LoginForm />
    </div>
  );
}