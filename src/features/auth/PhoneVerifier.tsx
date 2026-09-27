import { RecaptchaVerifier, type ApplicationVerifier } from 'firebase/auth';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { env } from '@/config/env';
import { auth } from '@/services/firebase/app';

export interface PhoneVerifierHandle {
  getVerifier(): ApplicationVerifier;
}

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

/**
 * Supplies the reCAPTCHA ApplicationVerifier required by Firebase phone auth
 * in the JS SDK. On native it renders Google's invisible reCAPTCHA inside a
 * WebView served from the project's authDomain; on web it uses the SDK's
 * RecaptchaVerifier. With the Auth emulator, verification is bypassed.
 */
export const PhoneVerifier = forwardRef<PhoneVerifierHandle>(function PhoneVerifier(_props, ref) {
  const [visible, setVisible] = useState(false);
  const pending = useRef<{ resolve: (token: string) => void; reject: (e: Error) => void } | null>(null);
  const webVerifier = useRef<RecaptchaVerifier | null>(null);

  useImperativeHandle(ref, () => ({
    getVerifier(): ApplicationVerifier {
      if (env.useEmulators) {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      if (Platform.OS === 'web') {
        webVerifier.current?.clear();
        webVerifier.current = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
        return webVerifier.current;
      }
      const verifier = {
        type: 'recaptcha',
        verify: () =>
          env.useEmulators
            ? Promise.resolve('emulator-token')
            : new Promise<string>((resolve, reject) => {
                pending.current = { resolve, reject };
                setVisible(true);
              }),
        _reset: () => undefined,
      };
      return verifier as unknown as ApplicationVerifier;
    },
  }));

  if (Platform.OS === 'web') {
    return <View nativeID={RECAPTCHA_CONTAINER_ID} />;
  }

  const config = JSON.stringify({
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
  });
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
</head><body style="margin:0;background:transparent"><div id="r"></div><script>
firebase.initializeApp(${config});
var v=new firebase.auth.RecaptchaVerifier('r',{size:'invisible',callback:function(t){window.ReactNativeWebView.postMessage(JSON.stringify({token:t}))},'expired-callback':function(){window.ReactNativeWebView.postMessage(JSON.stringify({error:'expired'}))}});
v.render().then(function(){return v.verify()}).catch(function(e){window.ReactNativeWebView.postMessage(JSON.stringify({error:String(e&&e.message||e)}))});
</script></body></html>`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        pending.current?.reject(new Error('cancelled'));
        setVisible(false);
      }}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center' }}>
        <View style={{ height: 520, marginHorizontal: 16 }}>
          <WebView
            source={{ html, baseUrl: `https://${env.firebase.authDomain}` }}
            javaScriptEnabled
            originWhitelist={['*']}
            style={{ backgroundColor: 'transparent' }}
            onMessage={(event) => {
              const msg = JSON.parse(event.nativeEvent.data) as { token?: string; error?: string };
              setVisible(false);
              if (msg.token) pending.current?.resolve(msg.token);
              else pending.current?.reject(new Error(msg.error ?? 'recaptcha-failed'));
              pending.current = null;
            }}
          />
        </View>
      </View>
    </Modal>
  );
});
