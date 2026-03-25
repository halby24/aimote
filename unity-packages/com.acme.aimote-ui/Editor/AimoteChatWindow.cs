using ReactUnity;
using ReactUnity.Editor.Renderer;
using ReactUnity.Helpers;
using UnityEditor;

namespace Acme.AimoteUI.Editor
{
    public class AimoteChatWindow : ReactWindow
    {
        [MenuItem("Window/Aimote Chat")]
        static void ShowWindow() => GetWindow<AimoteChatWindow>("Aimote Chat");

        protected override ScriptSource GetScript()
        {
            return new ScriptSource
            {
                Type = ScriptSourceType.Resource,
                SourcePath = "react/index"
            };
        }

        protected override GlobalRecord GetGlobals()
        {
            var globals = base.GetGlobals();
            globals["relayUrl"] = "ws://localhost:3001";
            return globals;
        }
    }
}
