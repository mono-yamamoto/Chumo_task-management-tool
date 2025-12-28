'use client';

import { CheckCircle } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  Typography,
  Link as MUILink,
} from '@mui/material';
import { Contact, ContactType } from '@/types';

type ContactListVariant = 'pending' | 'resolved';

type ContactListSectionProps = {
  title: string;
  contacts: Contact[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
  variant: ContactListVariant;
  onToggleStatus: (contactId: string, status: 'pending' | 'resolved') => void;
  isUpdating: boolean;
  getContactTypeLabel: (type: ContactType) => string;
  getContactTypeColor: (type: ContactType) => 'error' | 'info' | 'warning';
};

type ContactCardProps = {
  contact: Contact;
  variant: ContactListVariant;
  onToggleStatus: (contactId: string, status: 'pending' | 'resolved') => void;
  isUpdating: boolean;
  getContactTypeLabel: (type: ContactType) => string;
  getContactTypeColor: (type: ContactType) => 'error' | 'info' | 'warning';
};

function ContactCard({
  contact,
  variant,
  onToggleStatus,
  isUpdating,
  getContactTypeLabel,
  getContactTypeColor,
}: ContactCardProps) {
  const isResolved = variant === 'resolved';
  const statusLabel = isResolved ? '解決済み' : '対応中';
  const nextStatus = isResolved ? 'pending' : 'resolved';
  const actionLabel = isResolved ? '対応中に戻す' : '解決済みにする';

  return (
    <Card
      sx={{
        mb: 2,
        opacity: isResolved ? 0.6 : 1,
        backgroundColor: isResolved ? 'action.hover' : 'background.paper',
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Chip
                label={getContactTypeLabel(contact.type)}
                color={getContactTypeColor(contact.type)}
                size="small"
              />
              {isResolved ? (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                  label={statusLabel}
                  color="success"
                  size="small"
                  sx={{ opacity: 0.8 }}
                />
              ) : (
                <Chip label={statusLabel} color="warning" size="small" />
              )}
            </Box>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: isResolved ? 'text.disabled' : 'text.primary',
                textDecoration: isResolved ? 'line-through' : 'none',
              }}
            >
              {contact.title}
            </Typography>
            {contact.type === 'error' && contact.errorReportDetails ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  事象
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {contact.errorReportDetails.issue}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  再現方法
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {contact.errorReportDetails.reproductionSteps}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  環境
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  - デバイス: {contact.errorReportDetails.environment.device}
                </Typography>
                {contact.errorReportDetails.environment.device === 'PC' ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      - OS: {contact.errorReportDetails.environment.os}
                    </Typography>
                    {contact.errorReportDetails.environment.osVersion && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        - OSのバージョン: {contact.errorReportDetails.environment.osVersion}
                      </Typography>
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      - スマホの種類: {contact.errorReportDetails.environment.os}
                    </Typography>
                    {contact.errorReportDetails.environment.osVersion && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        - スマホのバージョン: {contact.errorReportDetails.environment.osVersion}
                      </Typography>
                    )}
                  </>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  - ブラウザ: {contact.errorReportDetails.environment.browser}
                </Typography>
                {contact.errorReportDetails.environment.browserVersion && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    - ブラウザのバージョン: {contact.errorReportDetails.environment.browserVersion}
                  </Typography>
                )}
                {contact.errorReportDetails.screenshotUrl && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      スクリーンショット
                    </Typography>
                    <Box
                      component="img"
                      src={contact.errorReportDetails.screenshotUrl}
                      alt="スクリーンショット"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        window.open(contact.errorReportDetails?.screenshotUrl || '', '_blank')
                      }
                    />
                    <MUILink
                      href={contact.errorReportDetails.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      画像を別ウィンドウで開く
                    </MUILink>
                  </Box>
                )}
                {contact.content && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                      その他の情報
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {contact.content}
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
              >
                {contact.content}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                送信者: {contact.userName} ({contact.userEmail})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                送信日時: {new Date(contact.createdAt).toLocaleString('ja-JP')}
              </Typography>
            </Box>
            {contact.githubIssueUrl && (
              <Box sx={{ mt: 1 }}>
                <MUILink href={contact.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                  GitHub Issueを開く
                </MUILink>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              ml: 2,
            }}
          >
            <Button
              onClick={() => onToggleStatus(contact.id, nextStatus)}
              disabled={isUpdating}
              variant="outlined"
              size="small"
            >
              {actionLabel}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function ContactListSection({
  title,
  contacts,
  isLoading,
  emptyMessage,
  variant,
  onToggleStatus,
  isUpdating,
  getContactTypeLabel,
  getContactTypeColor,
}: ContactListSectionProps) {
  return (
    <Box sx={{ mb: variant === 'pending' ? 4 : 0 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
        {title}
      </Typography>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && contacts && contacts.length === 0 && <Alert severity="info">{emptyMessage}</Alert>}
      {!isLoading && contacts && contacts.length > 0 && (
        <List>
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              variant={variant}
              onToggleStatus={onToggleStatus}
              isUpdating={isUpdating}
              getContactTypeLabel={getContactTypeLabel}
              getContactTypeColor={getContactTypeColor}
            />
          ))}
        </List>
      )}
    </Box>
  );
}
