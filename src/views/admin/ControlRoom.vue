<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  EyeOff,
  FileText,
  Flag,
  Flame,
  GaugeCircle,
  Loader2,
  Settings2,
  SlidersHorizontal,
  Trash2,
  UserCog,
} from 'lucide-vue-next'
import {
  adminAPI,
  type AdminAuditLog,
  type AdminApiError,
  type AdminDiagnostics,
  type AdminFeedback,
  type AdminHealthReport,
  type AdminJob,
  type AdminMaintenance,
  type AdminOperations,
  type AdminPaymentSummary,
  type AdminOverview,
  type AdminUser,
  type ContentBlock,
  type FeatureFlag,
  type SiteSetting,
} from '@/services/api'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import AuditLogsTab from '@/components/admin/AuditLogsTab.vue'
import ContentBlocksTab from '@/components/admin/ContentBlocksTab.vue'
import ErrorsTab from '@/components/admin/ErrorsTab.vue'
import FeatureFlagsTab from '@/components/admin/FeatureFlagsTab.vue'
import FeedbackTab from '@/components/admin/FeedbackTab.vue'
import JobsTab from '@/components/admin/JobsTab.vue'
import MaintenanceTab from '@/components/admin/MaintenanceTab.vue'
import OverviewTab from '@/components/admin/OverviewTab.vue'
import PaymentsTab from '@/components/admin/PaymentsTab.vue'
import SiteSettingsTab from '@/components/admin/SiteSettingsTab.vue'
import UsersTab from '@/components/admin/UsersTab.vue'
import { useSiteConfigStore } from '@/stores/siteConfig'

type TabId =
  | 'overview'
  | 'flags'
  | 'settings'
  | 'content'
  | 'users'
  | 'jobs'
  | 'payments'
  | 'feedback'
  | 'errors'
  | 'maintenance'
  | 'audit'

const siteConfigStore = useSiteConfigStore()
const loading = ref(true)
const savingKey = ref<string | null>(null)
const activeTab = ref<TabId>('overview')
const error = ref('')
const success = ref('')

const overview = ref<AdminOverview | null>(null)
const operations = ref<AdminOperations | null>(null)
const settings = ref<SiteSetting[]>([])
const flags = ref<FeatureFlag[]>([])
const contentBlocks = ref<ContentBlock[]>([])
const auditLogs = ref<AdminAuditLog[]>([])
const users = ref<AdminUser[]>([])
const jobs = ref<AdminJob[]>([])
const feedbackReports = ref<AdminFeedback[]>([])
const apiErrors = ref<AdminApiError[]>([])
const diagnostics = ref<AdminDiagnostics | null>(null)
const healthReport = ref<AdminHealthReport | null>(null)
const maintenance = ref<AdminMaintenance | null>(null)
const paymentSummary = ref<AdminPaymentSummary | null>(null)
const userSearch = ref('')
const jobStatusFilter = ref('')
const jobSearch = ref('')
const paymentProviderFilter = ref('')
const paymentStatusFilter = ref('')
const feedbackStatusFilter = ref('')
const highlightedFeedbackId = ref<number | null>(null)
const copiedFeedbackId = ref<number | null>(null)
const healthReportCopied = ref(false)
const diagnosticSummaryCopied = ref(false)
const reconciliationCopied = ref(false)
const evidenceCopied = ref(false)

type AdminConfirmation = {
  title: string
  summary: string
  details: string[]
  confirmLabel: string
  savingKey: string
  tone: 'danger' | 'warning'
  run: () => Promise<void>
}

const tabs = [
  { id: 'overview' as const, label: '运营总览', icon: GaugeCircle },
  { id: 'flags' as const, label: '功能开关', icon: Flag },
  { id: 'settings' as const, label: '站点配置', icon: Settings2 },
  { id: 'content' as const, label: '内容块', icon: FileText },
  { id: 'users' as const, label: '用户管理', icon: UserCog },
  { id: 'jobs' as const, label: '任务观察', icon: GaugeCircle },
  { id: 'payments' as const, label: '支付对账', icon: CreditCard },
  { id: 'feedback' as const, label: '问题反馈', icon: ClipboardList },
  { id: 'errors' as const, label: '错误观察', icon: Flame },
  { id: 'maintenance' as const, label: '维护清理', icon: Trash2 },
  { id: 'audit' as const, label: '审计日志', icon: Activity },
]

const enabledFlagCount = computed(() => flags.value.filter((flag) => flag.enabled).length)
const lockedFlagCount = computed(
  () => flags.value.filter((flag) => flag.requires_login || flag.requires_pro).length
)
const selectedContent = ref<ContentBlock | null>(null)
const pendingConfirmation = ref<AdminConfirmation | null>(null)
const filteredJobs = computed(() => {
  const keyword = jobSearch.value.trim().toLowerCase()
  if (!keyword) return jobs.value
  return jobs.value.filter((job) =>
    [
      job.job_id,
      job.job_type,
      job.status,
      job.user_email || '',
      job.input_file_name,
      job.error_message || '',
    ].some((value) => value.toLowerCase().includes(keyword))
  )
})

const refreshAdminMeta = async () => {
  const [overviewData, operationsData, healthReportData, maintenanceData, auditData] =
    await Promise.all([
      adminAPI.getOverview(),
      adminAPI.getOperations(),
      adminAPI.getHealthReport(),
      adminAPI.getMaintenance(),
      adminAPI.listAuditLogs(),
    ])
  overview.value = overviewData
  operations.value = operationsData
  healthReport.value = healthReportData
  maintenance.value = maintenanceData
  auditLogs.value = auditData
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const setMessage = (message: string) => {
  success.value = message
  window.setTimeout(() => {
    if (success.value === message) {
      success.value = ''
    }
  }, 2200)
}

const parseDiagnostics = (value: string | null) => {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const buildFeedbackSummary = (report: AdminFeedback) => {
  const lines = [
    `PDF-Flow 反馈 #${report.id}`,
    `状态：${report.status}`,
    `类型：${report.category}`,
    `影响程度：${report.severity}`,
    `标题：${report.title}`,
    `页面：${report.page_url || '未记录'}`,
    `诊断码：${report.diagnostic_code || '未记录'}`,
    `联系：${report.email || '未提供'}`,
    `提交时间：${formatDate(report.created_at)}`,
    '',
    '用户描述：',
    report.message,
  ]

  const diagnostics = parseDiagnostics(report.diagnostics)
  if (diagnostics) {
    lines.push('', '诊断信息：', diagnostics)
  }

  if (report.user_agent) {
    lines.push('', `浏览器：${report.user_agent}`)
  }

  if (report.admin_note) {
    lines.push('', '管理员备注：', report.admin_note)
  }

  return lines.join('\n')
}

const copyFeedbackSummary = async (report: AdminFeedback) => {
  try {
    await navigator.clipboard?.writeText(buildFeedbackSummary(report))
    copiedFeedbackId.value = report.id
    setMessage(`已复制反馈 #${report.id} 摘要`)
    window.setTimeout(() => {
      if (copiedFeedbackId.value === report.id) {
        copiedFeedbackId.value = null
      }
    }, 1800)
  } catch {
    error.value = '复制失败，请手动选中反馈内容复制。'
  }
}

const serviceStatusText = (report: AdminHealthReport | null) => {
  if (!report) return 'unknown'
  return Object.entries(report.services)
    .map(([name, service]) => `${name}=${service.status}`)
    .join(', ')
}

const buildHealthReportSummary = () => {
  const report = healthReport.value
  if (!report) return ''

  return [
    'PDF-Flow 上线健康报告',
    `生成时间：${formatDate(report.generated_at)}`,
    `前端版本：${import.meta.env.VITE_APP_VERSION || 'frontend-build'}`,
    `后端版本：${report.app_version}`,
    `环境：${report.environment}`,
    `数据库迁移：${report.migration_version || '未读取到'}`,
    `服务状态：${serviceStatusText(report)}`,
    `用户：${report.active_users_count}/${report.users_count} 活跃`,
    `任务：失败 ${report.failed_jobs_count}，处理中 ${report.running_jobs_count}`,
    `反馈：待处理 ${report.open_feedback_count}`,
    `API 错误：${report.api_error_count}`,
    `最近错误路径：${report.recent_error_path || '无'}`,
    `最近反馈：${report.recent_feedback_title || '无'}`,
    `页面：${window.location.href}`,
  ].join('\n')
}

const copyHealthReport = async () => {
  if (!healthReport.value) {
    error.value = '健康报告还没有加载完成，请先刷新。'
    return
  }

  try {
    await navigator.clipboard?.writeText(buildHealthReportSummary())
    healthReportCopied.value = true
    setMessage('已复制上线健康报告')
    window.setTimeout(() => {
      healthReportCopied.value = false
    }, 1800)
  } catch {
    error.value = '复制健康报告失败，请手动选中报告内容复制。'
  }
}

const copyDiagnosticSummary = async () => {
  if (!diagnostics.value?.diagnostic_summary) {
    error.value = '诊断摘要还没有加载完成，请先刷新。'
    return
  }

  try {
    await navigator.clipboard?.writeText(diagnostics.value.diagnostic_summary)
    diagnosticSummaryCopied.value = true
    setMessage('已复制诊断排障包')
    window.setTimeout(() => {
      diagnosticSummaryCopied.value = false
    }, 1800)
  } catch {
    error.value = '复制诊断排障包失败，请手动选中摘要内容复制。'
  }
}

const copyReconciliationSummary = async () => {
  if (!paymentSummary.value?.reconciliation_summary) {
    error.value = '支付对账摘要还没有加载完成，请先刷新。'
    return
  }

  try {
    await navigator.clipboard?.writeText(paymentSummary.value.reconciliation_summary)
    reconciliationCopied.value = true
    setMessage('已复制支付对账包')
    window.setTimeout(() => {
      reconciliationCopied.value = false
    }, 1800)
  } catch {
    error.value = '复制支付对账包失败，请手动选中摘要内容复制。'
  }
}

const copyPaymentEvidencePacket = async () => {
  if (!paymentSummary.value?.integration_evidence_packet) {
    error.value = '支付联调证据包还没有加载完成，请先刷新。'
    return
  }

  try {
    await navigator.clipboard?.writeText(paymentSummary.value.integration_evidence_packet)
    evidenceCopied.value = true
    setMessage('已复制支付联调证据包')
    window.setTimeout(() => {
      evidenceCopied.value = false
    }, 1800)
  } catch {
    error.value = '复制支付联调证据包失败，请手动选中摘要内容复制。'
  }
}

const openAdminConfirmation = (confirmation: AdminConfirmation) => {
  error.value = ''
  pendingConfirmation.value = confirmation
}

const closeAdminConfirmation = () => {
  if (pendingConfirmation.value && savingKey.value === pendingConfirmation.value.savingKey) return
  pendingConfirmation.value = null
}

const confirmAdminAction = async () => {
  const confirmation = pendingConfirmation.value
  if (!confirmation) return

  try {
    await confirmation.run()
    pendingConfirmation.value = null
  } catch {
    // Action handlers own their user-facing error copy.
  }
}

const loadHealthReport = async () => {
  savingKey.value = 'health-report:refresh'
  error.value = ''

  try {
    healthReport.value = await adminAPI.getHealthReport()
  } catch {
    error.value = '健康报告加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const loadAdminData = async () => {
  loading.value = true
  error.value = ''

  try {
    const [
      overviewData,
      operationsData,
      settingsData,
      flagsData,
      contentData,
      usersData,
      jobsData,
      feedbackData,
      paymentData,
      diagnosticsData,
      healthReportData,
      maintenanceData,
      auditData,
    ] = await Promise.all([
      adminAPI.getOverview(),
      adminAPI.getOperations(),
      adminAPI.listSettings(),
      adminAPI.listFeatureFlags(),
      adminAPI.listContentBlocks(),
      adminAPI.listUsers(),
      adminAPI.listJobs(),
      adminAPI.listFeedback(),
      adminAPI.getPaymentSummary(),
      adminAPI.getDiagnostics(),
      adminAPI.getHealthReport(),
      adminAPI.getMaintenance(),
      adminAPI.listAuditLogs(),
    ])

    overview.value = overviewData
    operations.value = operationsData
    settings.value = settingsData
    flags.value = flagsData
    contentBlocks.value = contentData
    users.value = usersData
    jobs.value = jobsData
    feedbackReports.value = feedbackData
    paymentSummary.value = paymentData
    diagnostics.value = diagnosticsData
    healthReport.value = healthReportData
    maintenance.value = maintenanceData
    apiErrors.value = diagnosticsData.recent_errors
    auditLogs.value = auditData
    selectedContent.value = contentData[0] ?? null
  } catch (err: any) {
    error.value =
      err?.response?.status === 403
        ? '当前账号没有后台权限。'
        : '后台数据加载失败，请稍后重试或检查服务端日志。'
  } finally {
    loading.value = false
  }
}

const saveFlag = async (flag: FeatureFlag) => {
  savingKey.value = `flag:${flag.key}`
  error.value = ''

  try {
    const updated = await adminAPI.updateFeatureFlag(flag.key, {
      label: flag.label,
      description: flag.description,
      enabled: flag.enabled,
      requires_login: flag.requires_login,
      requires_pro: flag.requires_pro,
      maintenance_message: flag.maintenance_message,
    })
    const index = flags.value.findIndex((item) => item.key === updated.key)
    if (index >= 0) flags.value[index] = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.label}`)
  } catch {
    error.value = '功能开关保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveSetting = async (setting: SiteSetting) => {
  savingKey.value = `setting:${setting.key}`
  error.value = ''

  try {
    const updated = await adminAPI.updateSetting(setting.key, {
      value: setting.value,
      value_type: setting.value_type,
      group: setting.group,
      label: setting.label,
      description: setting.description,
      is_public: setting.is_public,
    })
    const index = settings.value.findIndex((item) => item.key === updated.key)
    if (index >= 0) settings.value[index] = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.label}`)
  } catch {
    error.value = '站点配置保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveContentBlock = async (block: ContentBlock) => {
  savingKey.value = `content:${block.key}:${block.locale}`
  error.value = ''

  try {
    const updated = await adminAPI.updateContentBlock(block.key, block.locale, {
      locale: block.locale,
      title: block.title,
      content: block.content,
      description: block.description,
      is_public: block.is_public,
    })
    const index = contentBlocks.value.findIndex(
      (item) => item.key === updated.key && item.locale === updated.locale
    )
    if (index >= 0) contentBlocks.value[index] = updated
    selectedContent.value = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.title}`)
  } catch {
    error.value = '内容块保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const searchUsers = async () => {
  savingKey.value = 'users:search'
  error.value = ''

  try {
    users.value = await adminAPI.listUsers({
      search: userSearch.value.trim() || undefined,
    })
  } catch {
    error.value = '用户列表加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveUser = async (user: AdminUser) => {
  savingKey.value = `user:${user.id}`
  error.value = ''

  try {
    const updated = await adminAPI.updateUser(user.id, {
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
    })
    const index = users.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) users.value[index] = updated
    await refreshAdminMeta()
    setMessage(`已更新用户：${updated.email}`)
  } catch (err: any) {
    error.value = err?.response?.data?.detail || '用户更新失败，请确认权限和输入后重试。'
    users.value = await adminAPI.listUsers({
      search: userSearch.value.trim() || undefined,
    })
  } finally {
    savingKey.value = null
  }
}

const toggleUserBan = async (user: AdminUser) => {
  const nextActive = !user.is_active
  savingKey.value = `ban:${user.id}`
  error.value = ''

  try {
    const updated = await adminAPI.updateUser(user.id, {
      is_active: nextActive,
    })
    const index = users.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) users.value[index] = updated
    await refreshAdminMeta()
    setMessage(nextActive ? `已解封用户：${updated.email}` : `已封禁用户：${updated.email}`)
  } catch (err: any) {
    error.value = err?.response?.data?.detail || '账号状态更新失败，请稍后重试。'
    await searchUsers()
  } finally {
    savingKey.value = null
  }
}

const deleteUser = async (user: AdminUser) => {
  openAdminConfirmation({
    title: '确认删除用户',
    summary: `将删除 ${user.email} 及其关联数据。`,
    details: [
      '此操作不能直接撤销。',
      '当前管理员账号不能删除自己，后端仍会再次校验权限。',
      '执行结果会写入审计日志。',
    ],
    confirmLabel: '确认删除用户',
    savingKey: `delete:${user.id}`,
    tone: 'danger',
    run: async () => {
      savingKey.value = `delete:${user.id}`
      error.value = ''

      try {
        await adminAPI.deleteUser(user.id)
        users.value = users.value.filter((item) => item.id !== user.id)
        await refreshAdminMeta()
        setMessage(`已删除用户：${user.email}`)
      } catch (err: any) {
        error.value = err?.response?.data?.detail || '删除用户失败，请确认不是当前管理员账号。'
        throw err
      } finally {
        savingKey.value = null
      }
    },
  })
}

const loadJobs = async () => {
  savingKey.value = 'jobs:refresh'
  error.value = ''

  try {
    jobs.value = await adminAPI.listJobs({
      status_filter: jobStatusFilter.value || undefined,
    })
    operations.value = await adminAPI.getOperations()
  } catch {
    error.value = '任务列表加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const loadPayments = async () => {
  savingKey.value = 'payments:refresh'
  error.value = ''

  try {
    paymentSummary.value = await adminAPI.getPaymentSummary({
      provider: paymentProviderFilter.value || undefined,
      status_filter: paymentStatusFilter.value || undefined,
    })
  } catch {
    error.value = '支付对账数据加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const loadFeedback = async () => {
  savingKey.value = 'feedback:refresh'
  error.value = ''

  try {
    feedbackReports.value = await adminAPI.listFeedback({
      status_filter: feedbackStatusFilter.value || undefined,
    })
    overview.value = await adminAPI.getOverview()
  } catch {
    error.value = '问题反馈加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveFeedback = async (report: AdminFeedback) => {
  savingKey.value = `feedback:${report.id}`
  error.value = ''

  try {
    const updated = await adminAPI.updateFeedback(report.id, {
      status: report.status,
      admin_note: report.admin_note,
    })
    const index = feedbackReports.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) feedbackReports.value[index] = updated
    const [overviewData, diagnosticsData, auditData] = await Promise.all([
      adminAPI.getOverview(),
      adminAPI.getDiagnostics(),
      adminAPI.listAuditLogs(),
    ])
    overview.value = overviewData
    diagnostics.value = diagnosticsData
    apiErrors.value = diagnosticsData.recent_errors
    auditLogs.value = auditData
    setMessage(`已更新反馈 #${updated.id}`)
  } catch {
    error.value = '反馈状态保存失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const cleanupLiveAcceptanceFeedback = async () => {
  savingKey.value = 'feedback:cleanup-live'
  error.value = ''

  try {
    const result = await adminAPI.cleanupLiveAcceptanceFeedback()
    const [
      feedbackData,
      overviewData,
      diagnosticsData,
      healthReportData,
      maintenanceData,
      auditData,
    ] = await Promise.all([
      adminAPI.listFeedback({
        status_filter: feedbackStatusFilter.value || undefined,
      }),
      adminAPI.getOverview(),
      adminAPI.getDiagnostics(),
      adminAPI.getHealthReport(),
      adminAPI.getMaintenance(),
      adminAPI.listAuditLogs(),
    ])
    feedbackReports.value = feedbackData
    overview.value = overviewData
    diagnostics.value = diagnosticsData
    apiErrors.value = diagnosticsData.recent_errors
    healthReport.value = healthReportData
    maintenance.value = maintenanceData
    auditLogs.value = auditData
    setMessage(
      `已关闭 ${result.closed_count} 条验收反馈，剩余待处理 ${result.remaining_open_count} 条`
    )
  } catch {
    error.value = '验收反馈清理失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const refreshMaintenance = async () => {
  savingKey.value = 'maintenance:refresh'
  error.value = ''

  try {
    await refreshAdminMeta()
    diagnostics.value = await adminAPI.getDiagnostics()
    apiErrors.value = diagnostics.value.recent_errors
    setMessage('已重新统计维护数据，未执行任何删除操作')
  } catch {
    error.value = '维护数据重新统计失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const cleanupTestUsers = async () => {
  const count = maintenance.value?.test_users_count ?? 0
  openAdminConfirmation({
    title: '确认删除测试账号',
    summary: `将删除 ${count} 个测试账号。`,
    details: [
      '这才会真正删除数据；“重新统计数量”不会删除任何内容。',
      '仅匹配 smoke-、ocr-、office- 和 @example.com 测试账号。',
      '不会删除管理员或真实用户，后端会按同一规则再次校验。',
    ],
    confirmLabel: '确认删除测试账号',
    savingKey: 'maintenance:cleanup-users',
    tone: 'danger',
    run: async () => {
      savingKey.value = 'maintenance:cleanup-users'
      error.value = ''

      try {
        const result = await adminAPI.cleanupTestUsers()
        const [usersData, jobsData, feedbackData, diagnosticsData] = await Promise.all([
          adminAPI.listUsers({
            search: userSearch.value.trim() || undefined,
          }),
          adminAPI.listJobs({
            status_filter: jobStatusFilter.value || undefined,
          }),
          adminAPI.listFeedback({
            status_filter: feedbackStatusFilter.value || undefined,
          }),
          adminAPI.getDiagnostics(),
        ])
        users.value = usersData
        jobs.value = jobsData
        feedbackReports.value = feedbackData
        diagnostics.value = diagnosticsData
        apiErrors.value = diagnosticsData.recent_errors
        await refreshAdminMeta()
        setMessage(
          `已删除 ${result.deleted_count} 个测试账号，剩余 ${result.remaining_test_users_count} 个`
        )
      } catch (err: any) {
        error.value = err?.response?.data?.detail || '测试账号清理失败，请稍后重试。'
        throw err
      } finally {
        savingKey.value = null
      }
    },
  })
}

const cleanupExpiredFiles = async () => {
  const count = maintenance.value?.file_retention?.removable_count ?? 0
  openAdminConfirmation({
    title: '确认清理过期临时文件',
    summary: `将清理 ${count} 个过期临时文件目录。`,
    details: [
      `扫描目录：${maintenance.value?.file_retention?.upload_dir || '未读取到上传目录'}`,
      '只会删除 PDF-Flow 生成的过期临时上传、转换结果和下载包。',
      '不会删除用户账号、反馈、审计日志或数据库记录。',
    ],
    confirmLabel: '确认清理临时文件',
    savingKey: 'maintenance:cleanup-files',
    tone: 'warning',
    run: async () => {
      savingKey.value = 'maintenance:cleanup-files'
      error.value = ''

      try {
        const result = await adminAPI.cleanupExpiredFiles()
        await refreshAdminMeta()
        setMessage(
          `已清理 ${result.removed_count} 个过期临时目录，释放 ${formatBytes(result.removed_bytes)}`
        )
      } catch (err: any) {
        error.value = err?.response?.data?.detail || '临时文件清理失败，请稍后重试。'
        throw err
      } finally {
        savingKey.value = null
      }
    },
  })
}

const openFeedbackFromDiagnostics = async (feedbackId: number) => {
  activeTab.value = 'feedback'
  feedbackStatusFilter.value = ''
  highlightedFeedbackId.value = feedbackId
  await loadFeedback()
  await nextTick()

  document.getElementById(`feedback-${feedbackId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

const loadDiagnostics = async () => {
  savingKey.value = 'errors:refresh'
  error.value = ''

  try {
    const data = await adminAPI.getDiagnostics()
    diagnostics.value = data
    apiErrors.value = data.recent_errors
    overview.value = await adminAPI.getOverview()
  } catch {
    error.value = '错误观察数据加载失败，请稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const formatBytes = (value: number) => {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency || 'USD',
  }).format((amountCents || 0) / 100)

onMounted(loadAdminData)
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPanel as="section" padding="lg" class="shadow-sm">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
            >
              <EyeOff class="h-4 w-4" />
              Hidden Operations
            </div>
            <h1 class="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              PDF-Flow Control Room
            </h1>
            <p
              class="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base"
            >
              这是隐藏后台的第一阶段。这里不会出现在普通用户导航里，但真正的保护来自后端 ADMIN
              权限、接口鉴权和审计日志。
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-center sm:grid-cols-6">
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ enabledFlagCount }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">已开启</p>
            </AdminPanel>
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ lockedFlagCount }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">受限功能</p>
            </AdminPanel>
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ overview?.content_blocks_count ?? 0 }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">内容块</p>
            </AdminPanel>
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ overview?.active_users_count ?? 0 }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">活跃用户</p>
            </AdminPanel>
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ overview?.failed_jobs_count ?? 0 }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">失败任务</p>
            </AdminPanel>
            <AdminPanel as="div" padding="sm">
              <p class="text-2xl font-semibold">{{ overview?.open_feedback_count ?? 0 }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">待处理反馈</p>
            </AdminPanel>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        v-if="error"
        as="div"
        tone="danger"
        padding="sm"
        class="mt-6 text-sm text-rose-700 dark:text-rose-200"
      >
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
          <span>{{ error }}</span>
        </div>
      </AdminPanel>

      <AdminPanel
        v-if="success"
        as="div"
        tone="success"
        padding="sm"
        class="mt-6 text-sm text-emerald-700 dark:text-emerald-200"
      >
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0" />
          <span>{{ success }}</span>
        </div>
      </AdminPanel>

      <div
        v-if="loading"
        class="mt-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white p-16 dark:border-slate-800 dark:bg-slate-900"
      >
        <Loader2 class="h-8 w-8 animate-spin text-sky-600 dark:text-sky-300" />
      </div>

      <section v-else class="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <AdminPanel as="aside" padding="sm">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition"
            :class="
              activeTab === tab.id
                ? 'bg-slate-950 text-white shadow-sm dark:bg-sky-400 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            "
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            <span class="font-semibold">{{ tab.label }}</span>
          </button>
        </AdminPanel>

        <div class="min-w-0">
          <OverviewTab
            v-if="activeTab === 'overview'"
            :overview="overview"
            :operations="operations"
            :jobs="jobs"
            :health-report="healthReport"
            :health-report-summary="buildHealthReportSummary()"
            :health-report-copied="healthReportCopied"
            :saving-key="savingKey"
            :format-date="formatDate"
            @refresh-all="loadAdminData"
            @refresh-health-report="loadHealthReport"
            @copy-health-report="copyHealthReport"
          />

          <FeatureFlagsTab
            v-else-if="activeTab === 'flags'"
            :flags="flags"
            :saving-key="savingKey"
            @save="saveFlag"
          />

          <SiteSettingsTab
            v-else-if="activeTab === 'settings'"
            :settings="settings"
            :saving-key="savingKey"
            @save="saveSetting"
          />

          <ContentBlocksTab
            v-else-if="activeTab === 'content'"
            :blocks="contentBlocks"
            :selected-content="selectedContent"
            :saving-key="savingKey"
            @select="selectedContent = $event"
            @save="saveContentBlock"
          />

          <UsersTab
            v-else-if="activeTab === 'users'"
            :users="users"
            :user-search="userSearch"
            :saving-key="savingKey"
            :format-date="formatDate"
            @update:user-search="userSearch = $event"
            @search="searchUsers"
            @save="saveUser"
            @toggle-ban="toggleUserBan"
            @delete="deleteUser"
          />

          <JobsTab
            v-else-if="activeTab === 'jobs'"
            :filtered-jobs="filteredJobs"
            :job-search="jobSearch"
            :job-status-filter="jobStatusFilter"
            :saving-key="savingKey"
            :format-date="formatDate"
            @update:job-search="jobSearch = $event"
            @update:job-status-filter="jobStatusFilter = $event"
            @refresh="loadJobs"
          />

          <PaymentsTab
            v-else-if="activeTab === 'payments'"
            :payment-summary="paymentSummary"
            :payment-provider-filter="paymentProviderFilter"
            :payment-status-filter="paymentStatusFilter"
            :reconciliation-copied="reconciliationCopied"
            :evidence-copied="evidenceCopied"
            :saving-key="savingKey"
            :format-date="formatDate"
            :format-money="formatMoney"
            @update:payment-provider-filter="
              paymentProviderFilter = $event;
              loadPayments()
            "
            @update:payment-status-filter="
              paymentStatusFilter = $event;
              loadPayments()
            "
            @refresh="loadPayments"
            @copy-reconciliation="copyReconciliationSummary"
            @copy-evidence="copyPaymentEvidencePacket"
          />

          <FeedbackTab
            v-else-if="activeTab === 'feedback'"
            :feedback-reports="feedbackReports"
            :feedback-status-filter="feedbackStatusFilter"
            :highlighted-feedback-id="highlightedFeedbackId"
            :copied-feedback-id="copiedFeedbackId"
            :saving-key="savingKey"
            :format-date="formatDate"
            :parse-diagnostics="parseDiagnostics"
            @update:feedback-status-filter="feedbackStatusFilter = $event"
            @refresh="loadFeedback"
            @cleanup-live="cleanupLiveAcceptanceFeedback"
            @copy-summary="copyFeedbackSummary"
            @save="saveFeedback"
          />

          <ErrorsTab
            v-else-if="activeTab === 'errors'"
            :api-errors="apiErrors"
            :diagnostics="diagnostics"
            :operations="operations"
            :overview="overview"
            :diagnostic-summary-copied="diagnosticSummaryCopied"
            :saving-key="savingKey"
            :format-date="formatDate"
            @refresh="loadDiagnostics"
            @copy-diagnostic-summary="copyDiagnosticSummary"
            @open-feedback="openFeedbackFromDiagnostics"
          />

          <MaintenanceTab
            v-else-if="activeTab === 'maintenance'"
            :maintenance="maintenance"
            :operations="operations"
            :diagnostics="diagnostics"
            :saving-key="savingKey"
            @refresh="refreshMaintenance"
            @cleanup-live="cleanupLiveAcceptanceFeedback"
            @cleanup-test-users="cleanupTestUsers"
            @cleanup-expired-files="cleanupExpiredFiles"
          />

          <AuditLogsTab v-else :audit-logs="auditLogs" :format-date="formatDate" />
        </div>
      </section>

      <section
        class="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <div class="flex items-start gap-3">
          <SlidersHorizontal class="mt-1 h-5 w-5 shrink-0" />
          <p>
            当前阶段已经能通过后台维护配置、功能开关和内容块。下一阶段需要把公开页面和工具页统一接入这些后端开关，让“关闭功能
            / 维护提示 / 登录要求 / Pro 要求”真正影响用户界面和 API 行为。
          </p>
        </div>
      </section>

      <ConfirmationDialog
        :model-value="!!pendingConfirmation"
        :title="pendingConfirmation?.title || ''"
        :summary="pendingConfirmation?.summary || ''"
        :details="pendingConfirmation?.details || []"
        :confirm-label="pendingConfirmation?.confirmLabel || ''"
        cancel-label="取消"
        :tone="pendingConfirmation?.tone || 'danger'"
        :loading="!!pendingConfirmation && savingKey === pendingConfirmation.savingKey"
        @update:model-value="(value) => { if (!value) closeAdminConfirmation() }"
        @confirm="confirmAdminAction"
      />
    </main>
  </div>
</template>
