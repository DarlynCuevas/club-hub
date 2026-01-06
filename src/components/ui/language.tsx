import { useAuth } from '@/contexts/AuthContext'
import i18n from '@/i18n'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

function LanguageSwitcher() {
    const { user } = useAuth()
    const [lang, setLang] = useState(i18n.language)
    const changeLang = async (newLang: string) => {
        setLang(newLang)
        i18n.changeLanguage(newLang)
        localStorage.setItem('lang', newLang)
        if (user) {
            await supabase
                .from('users_profile')
                .update({ language: newLang })
                .eq('id', user.id)
        }
    }

return (
    <select
      value={lang}
      onChange={(e) => changeLang(e.target.value)}
      className="border rounded-md px-3 py-2"
    >
      <option value="es">Español</option>
      <option value="en">English</option>
      <option value="ca">Català</option>
    </select>
  )
}
export default LanguageSwitcher