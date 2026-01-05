import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockMessages } from '@/data/mockData';
import { Bell, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const sortedMessages = [...mockMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Official announcements from your club
        </p>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {sortedMessages.map((message) => (
          <Card key={message.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.priority === 'important' 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {message.priority === 'important' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {message.priority === 'important' && (
                      <Badge variant="destructive" className="text-xs">
                        Important
                      </Badge>
                    )}
                    {message.teamId && (
                      <Badge variant="secondary" className="text-xs">
                        Team
                      </Badge>
                    )}
                    {message.clubId && !message.teamId && (
                      <Badge variant="outline" className="text-xs">
                        Club-wide
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-foreground">{message.title}</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>{message.authorName}</span>
                    <span>•</span>
                    <span>{format(new Date(message.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
