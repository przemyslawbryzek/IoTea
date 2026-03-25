import { useState } from 'react';
import { Send, Mail, Phone, MessageCircle, Book } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export function TechSupport() {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      toast.success('Wiadomość wysłana! Odpowiemy w ciągu 24h');
      setMessage('');
    } else {
      toast.error('Wpisz wiadomość');
    }
  };

  return (
    <div className="space-y-4">
      {/* Formularz kontaktowy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Wyślij wiadomość
          </CardTitle>
          <CardDescription>Odpowiemy w ciągu 24 godzin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-message">Twoja wiadomość</Label>
            <Textarea
              id="support-message"
              placeholder="Opisz swój problem lub pytanie..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleSendMessage} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Wyślij wiadomość
          </Button>
        </CardContent>
      </Card>

      {/* Kontakt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bezpośredni kontakt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="mailto:support@iotea.com"
            className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <Mail className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">support@iotea.com</p>
            </div>
          </a>
          <a
            href="tel:+48123456789"
            className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <Phone className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Telefon</p>
              <p className="text-xs text-muted-foreground">+48 123 456 789</p>
            </div>
          </a>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Book className="w-4 h-4" />
            Najczęstsze pytania
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm">
                Jak połączyć czajnik z aplikacją?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Przejdź do zakładki "Urządzenie" w menu i kliknij "Połącz z czajnikiem". 
                Upewnij się, że czajnik jest włączony i znajduje się w tej samej sieci Wi-Fi.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm">
                Czajnik nie grzeje wody
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Sprawdź czy czajnik jest prawidłowo podłączony do zasilania oraz czy 
                poziom wody jest wystarczający. Jeśli problem nadal występuje, skontaktuj 
                się z naszym wsparciem technicznym.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-sm">
                Jak dodać własną herbatę?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Kliknij przycisk "Dodaj herbatę" na głównym ekranie i wypełnij formularz 
                z nazwą, opisem, czasem parzenia, temperaturą i kategorią.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-sm">
                Czy mogę używać aplikacji bez czajnika?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Tak! Aplikacja działa również jako timer i przewodnik po herbatach. 
                Połączenie z czajnikiem jest opcjonalne i dodaje automatyczne funkcje.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
