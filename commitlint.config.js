export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响代码运行的变动）
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'build',    // 构建系统或外部依赖的变动
        'ci',       // CI配置文件和脚本的变动
        'chore',    // 其他不修改src或test文件的变动
        'revert'    // 回滚commit
      ]
    ],
    'subject-case': [0] // 允许任意大小写
  }
};
