package ir.tajeddini.financepro.sms;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "ReadSMS", permissions = {
    @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS })
})
public class ReadSMSPlugin extends Plugin {

    private static final String TAG = "ReadSMSPlugin";
    private BroadcastReceiver smsReceiver;

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        registerSmsReceiver();
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        unregisterSmsReceiver();
    }

    private void registerSmsReceiver() {
        if (smsReceiver != null) return;
        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
                Bundle bundle = intent.getExtras();
                if (bundle == null) return;
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus == null) return;
                StringBuilder bodyBuilder = new StringBuilder();
                for (Object pdu : pdus) {
                    SmsMessage message = SmsMessage.createFromPdu((byte[]) pdu, bundle.getString("format"));
                    if (message == null) continue;
                    bodyBuilder.append(message.getMessageBody());
                }
                String body = bodyBuilder.toString();
                if (body.trim().isEmpty()) return;
                JSObject payload = new JSObject();
                JSObject value = new JSObject();
                value.put("body", body);
                value.put("address", "");
                value.put("date", System.currentTimeMillis());
                payload.put("value", value);
                notifyListeners("smsReceived", payload, false);
            }
        };

        IntentFilter filter = new IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
        getContext().registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
    }

    private void unregisterSmsReceiver() {
        if (smsReceiver == null) return;
        try {
            getContext().unregisterReceiver(smsReceiver);
        } catch (Exception ignored) {
            // ignore
        }
        smsReceiver = null;
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            JSObject ret = new JSObject();
            ret.put("value", "granted");
            call.resolve(ret);
            return;
        }

        if (hasReadSmsPermission()) {
            JSObject ret = new JSObject();
            ret.put("value", "granted");
            call.resolve(ret);
            return;
        }

        saveCall(call);

        if (shouldShowSmsPermissionRationale()) {
            requestPermissionForAliases(new String[] { "sms" }, call, "onSmsPermissionResult");
            return;
        }

        requestPermissionForAliases(new String[] { "sms" }, call, "onSmsPermissionResult");
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        String status = hasReadSmsPermission() ? "granted" : (isPermissionPermanentlyDenied() ? "permanently_denied" : "denied");
        JSObject ret = new JSObject();
        ret.put("value", status);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available");
            return;
        }

        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + activity.getPackageName()));
        activity.startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getSMS(PluginCall call) {
        if (!hasReadSmsPermission()) {
            JSObject ret = new JSObject();
            ret.put("value", new JSArray());
            call.resolve(ret);
            return;
        }

        String timestamp = call.getString("timestamp", "0");
        int pageSize = call.getInt("pageSize", 200);

        JSArray result = new JSArray();
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
        String[] projection = new String[] {
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.THREAD_ID,
            Telephony.Sms.TYPE
        };

        String selection = "date > ?";
        String[] selectionArgs = new String[] { timestamp };
        String sortOrder = "date DESC LIMIT " + pageSize;

        try (Cursor cursor = resolver.query(uri, projection, selection, selectionArgs, sortOrder)) {
            if (cursor == null) {
                JSObject out = new JSObject();
                out.put("value", result);
                call.resolve(out);
                return;
            }

            int idColumn = cursor.getColumnIndexOrThrow(Telephony.Sms._ID);
            int addressColumn = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS);
            int bodyColumn = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY);
            int dateColumn = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE);
            int threadColumn = cursor.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID);
            int typeColumn = cursor.getColumnIndexOrThrow(Telephony.Sms.TYPE);

            while (cursor.moveToNext()) {
                JSONObject sms = new JSONObject();
                sms.put("id", String.valueOf(cursor.getLong(idColumn)));
                sms.put("address", cursor.getString(addressColumn));
                sms.put("body", cursor.getString(bodyColumn) == null ? "" : cursor.getString(bodyColumn));
                sms.put("date", cursor.getLong(dateColumn));
                sms.put("threadId", cursor.getLong(threadColumn));
                sms.put("type", String.valueOf(cursor.getInt(typeColumn)));
                result.put(sms);
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS inbox: " + e.getMessage(), e);
            return;
        }

        JSObject out = new JSObject();
        out.put("value", result);
        call.resolve(out);
    }

    private boolean hasReadSmsPermission() {
        Context context = getContext();
        return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean shouldShowSmsPermissionRationale() {
        return getActivity() != null && shouldShowRequestPermissionRationale(Manifest.permission.READ_SMS);
    }

    private boolean isPermissionPermanentlyDenied() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        Activity activity = getActivity();
        if (activity == null) return false;
        return !shouldShowSmsPermissionRationale()
            && !hasReadSmsPermission();
    }

    @SuppressWarnings("unused")
    private void onSmsPermissionResult(PluginCall call, String permission, int result) {
        JSObject ret = new JSObject();
        ret.put("value", result == PackageManager.PERMISSION_GRANTED ? "granted" : (isPermissionPermanentlyDenied() ? "permanently_denied" : "denied"));
        call.resolve(ret);
    }
}
